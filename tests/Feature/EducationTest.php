<?php

namespace Tests\Feature;

use App\Models\EducationCategory;
use App\Models\EducationContent;
use App\Models\EducationFaq;
use App\Models\User;
use Database\Seeders\EducationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EducationTest extends TestCase
{
    use RefreshDatabase;

    private function createActiveAdmin(): User
    {
        return User::create([
            'name' => 'Administrator Edukasi',
            'email' => 'admin-edukasi@banyumas.go.id',
            'password' => Hash::make('AdminBanyumas2026!'),
            'role' => 'admin',
            'is_active' => true,
        ]);
    }

    /**
     * Test public /edukasi route is accessible without login and public API returns seeded categories, articles, and FAQs.
     */
    public function test_public_education_page_and_api_work_without_authentication(): void
    {
        $this->seed(EducationSeeder::class);

        $pageRes = $this->get('/edukasi');
        $pageRes->assertStatus(200);

        $apiRes = $this->getJson('/api/public/education');
        $apiRes->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertCount(4, $apiRes->json('categories'));
        $this->assertCount(5, $apiRes->json('articles'));
        $this->assertCount(5, $apiRes->json('faqs'));

        // Verify structured 3M Plus and symptoms guidance exist
        $this->assertCount(3, $apiRes->json('structured_sections.gerakan_3m_plus.core_3m'));
        $this->assertNotEmpty($apiRes->json('structured_sections.gerakan_3m_plus.plus_actions'));
        $this->assertNotEmpty($apiRes->json('structured_sections.gejala_dan_bahaya.warning_signs'));
        $this->assertNotEmpty($apiRes->json('references'));

        // Verify category filter works
        $catFilterRes = $this->getJson('/api/public/education?category=pencegahan-3m-plus');
        $catFilterRes->assertStatus(200);
        $this->assertCount(1, $catFilterRes->json('articles'));
        $this->assertSame('panduan-lengkap-gerakan-3m-plus', $catFilterRes->json('articles.0.slug'));

        // Verify detail endpoint by slug works
        $detailRes = $this->getJson('/api/public/education/panduan-lengkap-gerakan-3m-plus');
        $detailRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'article' => [
                    'slug' => 'panduan-lengkap-gerakan-3m-plus',
                ],
            ]);

        // Verify standalone FAQs endpoint works
        $faqRes = $this->getJson('/api/public/education/faqs');
        $faqRes->assertStatus(200);
        $this->assertCount(5, $faqRes->json('faqs'));
    }

    /**
     * Test unpublished articles and inactive categories/FAQs are strictly hidden from public endpoints.
     */
    public function test_unpublished_content_and_inactive_faqs_do_not_appear_in_public_api(): void
    {
        $this->seed(EducationSeeder::class);

        $category = EducationCategory::first();

        $draftArticle = EducationContent::create([
            'category_id' => $category->id,
            'title' => 'Draft Artikel Internal Belum Diterbitkan',
            'slug' => 'draft-artikel-internal-belum-diterbitkan',
            'summary' => 'Ringkasan draft internal',
            'content' => 'Isi draft yang belum diterbitkan',
            'sort_order' => 99,
            'is_published' => false,
        ]);

        EducationFaq::create([
            'question' => 'Pertanyaan Draft Nonaktif?',
            'answer' => 'Jawaban draft nonaktif',
            'sort_order' => 99,
            'is_active' => false,
        ]);

        $listRes = $this->getJson('/api/public/education');
        $listRes->assertStatus(200);
        $this->assertStringNotContainsString('Draft Artikel Internal Belum Diterbitkan', $listRes->getContent());
        $this->assertStringNotContainsString('Pertanyaan Draft Nonaktif?', $listRes->getContent());

        // Direct slug lookup for unpublished article must return 404
        $detailRes = $this->getJson('/api/public/education/' . $draftArticle->slug);
        $detailRes->assertStatus(404);
    }

    /**
     * Test unauthenticated guests and non-admin users cannot access CRUD endpoints.
     */
    public function test_guest_and_non_admin_cannot_access_education_crud_endpoints(): void
    {
        $this->seed(EducationSeeder::class);
        $category = EducationCategory::first();

        // Guest requests must be rejected (401)
        $this->getJson('/api/admin/education')->assertStatus(401);
        $this->postJson('/api/admin/education/contents', [
            'category_id' => $category->id,
            'title' => 'percobaan tanpa login',
            'content' => 'isi',
        ])->assertStatus(401);
        $this->deleteJson('/api/admin/education/contents/1')->assertStatus(401);

        // Non-admin user must be forbidden (403)
        $regularUser = User::create([
            'name' => 'Pengguna Biasa',
            'email' => 'user@banyumas.go.id',
            'password' => Hash::make('User12345!'),
            'role' => 'viewer',
            'is_active' => true,
        ]);

        $this->actingAs($regularUser)
            ->postJson('/api/admin/education/contents', [
                'category_id' => $category->id,
                'title' => 'percobaan non admin',
                'content' => 'isi',
            ])
            ->assertStatus(403);
    }

    /**
     * Test authenticated administrator can create, update, and delete categories, articles (with XSS stripping), and FAQs.
     */
    public function test_authenticated_admin_can_crud_education_contents_categories_and_faqs(): void
    {
        $this->seed(EducationSeeder::class);
        $admin = $this->createActiveAdmin();

        // 1. Create Category
        $catRes = $this->actingAs($admin)->postJson('/api/admin/education/categories', [
            'name' => 'Inovasi Pengendalian Vektor',
            'description' => 'Edukasi inovasi pengendalian vektor DBD.',
            'sort_order' => 5,
            'is_active' => true,
        ]);
        $catRes->assertStatus(201)
            ->assertJson(['success' => true]);
        $newCategoryId = $catRes->json('category.id');

        // 2. Create Article with script tags (verify XSS sanitization)
        $artRes = $this->actingAs($admin)->postJson('/api/admin/education/contents', [
            'category_id' => $newCategoryId,
            'title' => 'Panduan Pemantauan Jentik Mingguan <script>alert(1)</script>',
            'summary' => 'Ringkasan pemantauan jentik mandiri di rumah.',
            'content' => 'Periksa bak mandi dan tatakan dispenser setiap minggu.<script>evil()</script>',
            'reference_source' => 'Kemenkes RI',
            'sort_order' => 1,
            'is_published' => true,
        ]);
        $artRes->assertStatus(201)
            ->assertJson(['success' => true]);

        $createdArticle = $artRes->json('content');
        $this->assertStringNotContainsString('<script>', $createdArticle['title']);
        $this->assertStringNotContainsString('<script>', $createdArticle['content']);

        // Verify published article immediately appears on public API
        $pubCheck = $this->getJson('/api/public/education/' . $createdArticle['slug']);
        $pubCheck->assertStatus(200)
            ->assertJson([
                'success' => true,
                'article' => [
                    'title' => 'Panduan Pemantauan Jentik Mingguan alert(1)',
                ],
            ]);

        // 3. Edit Article (unpublish it and update title)
        $updateRes = $this->actingAs($admin)->putJson('/api/admin/education/contents/' . $createdArticle['id'], [
            'category_id' => $newCategoryId,
            'title' => 'Panduan Pemantauan Jentik Mingguan (Diperbarui)',
            'summary' => 'Ringkasan diperbarui.',
            'content' => 'Isi materi telah diperbarui oleh administrator.',
            'reference_source' => 'Kemenkes RI & WHO',
            'sort_order' => 2,
            'is_published' => false,
        ]);
        $updateRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'content' => [
                    'title' => 'Panduan Pemantauan Jentik Mingguan (Diperbarui)',
                    'is_published' => false,
                ],
            ]);

        // Verify unpublished article is now hidden from public API
        $this->getJson('/api/public/education/' . $createdArticle['slug'])->assertStatus(404);

        // 4. Delete Article
        $delRes = $this->actingAs($admin)->deleteJson('/api/admin/education/contents/' . $createdArticle['id']);
        $delRes->assertStatus(200)->assertJson(['success' => true]);
        $this->assertDatabaseMissing('education_contents', ['id' => $createdArticle['id']]);

        // 5. CRUD FAQ
        $faqStore = $this->actingAs($admin)->postJson('/api/admin/education/faqs', [
            'question' => 'Bagaimana cara menggunakan bubuk larvasida?',
            'answer' => 'Taburkan sesuai takaran pada penampungan air yang sulit dikuras.',
            'sort_order' => 6,
            'is_active' => true,
        ]);
        $faqStore->assertStatus(201);
        $faqId = $faqStore->json('faq.id');

        $this->actingAs($admin)->putJson("/api/admin/education/faqs/{$faqId}", [
            'question' => 'Bagaimana takaran bubuk larvasida (abate)?',
            'answer' => 'Gunakan 1 gram untuk 10 liter air sesuai petunjuk kemasan.',
            'sort_order' => 6,
            'is_active' => true,
        ])->assertStatus(200);

        $this->actingAs($admin)->deleteJson("/api/admin/education/faqs/{$faqId}")
            ->assertStatus(200);
    }

    /**
     * Test image upload security: allows valid PNG/JPG images and strictly rejects executable/PHP files.
     */
    public function test_admin_image_upload_allows_valid_images_and_rejects_executables(): void
    {
        $tempPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'phpunit_edu_' . uniqid();
        @mkdir($tempPath, 0777, true);
        $disk = Storage::build([
            'driver' => 'local',
            'root' => $tempPath,
        ]);
        Storage::set('public', $disk);
        $this->seed(EducationSeeder::class);
        $admin = $this->createActiveAdmin();
        $category = EducationCategory::first();

        // 1. Valid PNG image upload (1x1 transparent PNG binary recognized by getimagesize/fileinfo without GD extension)
        $pngBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
        $validImage = UploadedFile::fake()->createWithContent('ilustrasi-3m.png', $pngBytes);
        $validRes = $this->actingAs($admin)->postJson('/api/admin/education/contents', [
            'category_id' => $category->id,
            'title' => 'Artikel Dengan Ilustrasi Gambar Aman',
            'summary' => 'Ringkasan gambar aman',
            'content' => 'Konten edukasi dengan unggahan gambar valid.',
            'image' => $validImage,
            'is_published' => true,
        ]);
        $validRes->assertStatus(201);
        $storedPath = $validRes->json('content.image_path');
        $this->assertNotNull($storedPath);
        Storage::disk('public')->assertExists($storedPath);

        // 2. Reject executable / PHP script disguised upload
        $maliciousFile = UploadedFile::fake()->create('shell.php', 100, 'application/x-php');
        $rejectRes = $this->actingAs($admin)->postJson('/api/admin/education/contents', [
            'category_id' => $category->id,
            'title' => 'Artikel File Berbahaya',
            'content' => 'Konten percobaan file berbahaya.',
            'image' => $maliciousFile,
        ]);
        $rejectRes->assertStatus(422);
    }
}

