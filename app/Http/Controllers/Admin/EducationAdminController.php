<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EducationCategory;
use App\Models\EducationContent;
use App\Models\EducationFaq;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class EducationAdminController extends Controller
{
    /**
     * Get all categories, articles, and FAQs for administrator management (Fitur 11).
     */
    public function index(): JsonResponse
    {
        $categories = EducationCategory::withCount('contents')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $contents = EducationContent::with('category:id,name,slug')
            ->orderBy('sort_order')
            ->orderByDesc('id')
            ->get();

        $faqs = EducationFaq::orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'categories' => $categories,
            'contents' => $contents,
            'faqs' => $faqs,
        ]);
    }

    /**
     * Store a new education category.
     */
    public function storeCategory(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['nullable', 'string', 'max:140', 'regex:/^[a-z0-9\-]+$/i', 'unique:education_categories,slug'],
            'description' => ['nullable', 'string', 'max:1000'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi kategori gagal.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $name = strip_tags(trim((string) $request->input('name')));
        $rawSlug = $request->filled('slug')
            ? Str::slug((string) $request->input('slug'))
            : $this->generateUniqueSlug(EducationCategory::class, $name);

        $category = EducationCategory::create([
            'name' => $name,
            'slug' => $rawSlug,
            'description' => $request->filled('description') ? strip_tags(trim((string) $request->input('description'))) : null,
            'sort_order' => (int) $request->input('sort_order', 0),
            'is_active' => $request->boolean('is_active', true),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Kategori edukasi berhasil ditambahkan.',
            'category' => $category,
        ], 201);
    }

    /**
     * Update an existing education category.
     */
    public function updateCategory(Request $request, int $id): JsonResponse
    {
        $category = EducationCategory::find($id);
        if (! $category) {
            return response()->json([
                'success' => false,
                'message' => 'Kategori edukasi tidak ditemukan.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:120'],
            'slug' => [
                'nullable',
                'string',
                'max:140',
                'regex:/^[a-z0-9\-]+$/i',
                Rule::unique('education_categories', 'slug')->ignore($category->id),
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi perubahan kategori gagal.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $name = strip_tags(trim((string) $request->input('name')));
        $slug = $request->filled('slug')
            ? Str::slug((string) $request->input('slug'))
            : $category->slug;

        $category->update([
            'name' => $name,
            'slug' => $slug,
            'description' => $request->has('description')
                ? ($request->filled('description') ? strip_tags(trim((string) $request->input('description'))) : null)
                : $category->description,
            'sort_order' => (int) $request->input('sort_order', $category->sort_order),
            'is_active' => $request->has('is_active') ? $request->boolean('is_active') : $category->is_active,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Kategori edukasi berhasil diperbarui.',
            'category' => $category->fresh(),
        ]);
    }

    /**
     * Delete an education category.
     */
    public function destroyCategory(int $id): JsonResponse
    {
        $category = EducationCategory::find($id);
        if (! $category) {
            return response()->json([
                'success' => false,
                'message' => 'Kategori edukasi tidak ditemukan.',
            ], 404);
        }

        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Kategori edukasi berhasil dihapus.',
        ]);
    }

    /**
     * Store a new educational article with optional secure image upload.
     */
    public function storeContent(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'category_id' => ['required', 'integer', 'exists:education_categories,id'],
            'title' => ['required', 'string', 'max:200'],
            'slug' => ['nullable', 'string', 'max:220', 'regex:/^[a-z0-9\-]+$/i', 'unique:education_contents,slug'],
            'summary' => ['nullable', 'string', 'max:1000'],
            'content' => ['required', 'string', 'max:25000'],
            'reference_source' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_published' => ['nullable', 'boolean'],
            'image' => [
                'nullable',
                'file',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'mimetypes:image/jpeg,image/png,image/webp',
                'max:2048',
            ],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi artikel edukasi gagal.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $title = strip_tags(trim((string) $request->input('title')));
        $slug = $request->filled('slug')
            ? Str::slug((string) $request->input('slug'))
            : $this->generateUniqueSlug(EducationContent::class, $title);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $ext = strtolower($file->getClientOriginalExtension());
            if (! in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Format file gambar tidak diizinkan.',
                ], 422);
            }
            $filename = 'edu_' . Str::random(20) . '.' . $ext;
            Storage::disk('public')->makeDirectory('education');
            $imagePath = $file->storeAs('education', $filename, 'public');
        }

        $contentRecord = EducationContent::create([
            'category_id' => (int) $request->input('category_id'),
            'title' => $title,
            'slug' => $slug,
            'summary' => $request->filled('summary') ? strip_tags(trim((string) $request->input('summary'))) : null,
            'content' => strip_tags(trim((string) $request->input('content'))),
            'image_path' => $imagePath,
            'reference_source' => $request->filled('reference_source')
                ? strip_tags(trim((string) $request->input('reference_source')))
                : 'Kementerian Kesehatan Republik Indonesia & WHO',
            'sort_order' => (int) $request->input('sort_order', 0),
            'is_published' => $request->has('is_published') ? $request->boolean('is_published') : true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Artikel edukasi berhasil ditambahkan.',
            'content' => $contentRecord->load('category:id,name,slug'),
        ], 201);
    }

    /**
     * Update an existing educational article.
     */
    public function updateContent(Request $request, int $id): JsonResponse
    {
        $contentRecord = EducationContent::find($id);
        if (! $contentRecord) {
            return response()->json([
                'success' => false,
                'message' => 'Artikel edukasi tidak ditemukan.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'category_id' => ['required', 'integer', 'exists:education_categories,id'],
            'title' => ['required', 'string', 'max:200'],
            'slug' => [
                'nullable',
                'string',
                'max:220',
                'regex:/^[a-z0-9\-]+$/i',
                Rule::unique('education_contents', 'slug')->ignore($contentRecord->id),
            ],
            'summary' => ['nullable', 'string', 'max:1000'],
            'content' => ['required', 'string', 'max:25000'],
            'reference_source' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_published' => ['nullable', 'boolean'],
            'image' => [
                'nullable',
                'file',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'mimetypes:image/jpeg,image/png,image/webp',
                'max:2048',
            ],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi perubahan artikel edukasi gagal.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $title = strip_tags(trim((string) $request->input('title')));
        $slug = $request->filled('slug')
            ? Str::slug((string) $request->input('slug'))
            : $contentRecord->slug;

        $imagePath = $contentRecord->image_path;
        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $ext = strtolower($file->getClientOriginalExtension());
            if (! in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Format file gambar tidak diizinkan.',
                ], 422);
            }
            if ($imagePath && ! str_starts_with($imagePath, '/images/')) {
                Storage::disk('public')->delete($imagePath);
            }
            $filename = 'edu_' . Str::random(20) . '.' . $ext;
            Storage::disk('public')->makeDirectory('education');
            $imagePath = $file->storeAs('education', $filename, 'public');
        }

        $contentRecord->update([
            'category_id' => (int) $request->input('category_id'),
            'title' => $title,
            'slug' => $slug,
            'summary' => $request->has('summary')
                ? ($request->filled('summary') ? strip_tags(trim((string) $request->input('summary'))) : null)
                : $contentRecord->summary,
            'content' => strip_tags(trim((string) $request->input('content'))),
            'image_path' => $imagePath,
            'reference_source' => $request->has('reference_source')
                ? ($request->filled('reference_source') ? strip_tags(trim((string) $request->input('reference_source'))) : null)
                : $contentRecord->reference_source,
            'sort_order' => (int) $request->input('sort_order', $contentRecord->sort_order),
            'is_published' => $request->has('is_published') ? $request->boolean('is_published') : $contentRecord->is_published,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Artikel edukasi berhasil diperbarui.',
            'content' => $contentRecord->fresh()->load('category:id,name,slug'),
        ]);
    }

    /**
     * Delete an educational article.
     */
    public function destroyContent(int $id): JsonResponse
    {
        $contentRecord = EducationContent::find($id);
        if (! $contentRecord) {
            return response()->json([
                'success' => false,
                'message' => 'Artikel edukasi tidak ditemukan.',
            ], 404);
        }

        if ($contentRecord->image_path && ! str_starts_with($contentRecord->image_path, '/images/')) {
            Storage::disk('public')->delete($contentRecord->image_path);
        }

        $contentRecord->delete();

        return response()->json([
            'success' => true,
            'message' => 'Artikel edukasi berhasil dihapus.',
        ]);
    }

    /**
     * Store a new FAQ item.
     */
    public function storeFaq(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'question' => ['required', 'string', 'max:255'],
            'answer' => ['required', 'string', 'max:5000'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi FAQ gagal.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $faq = EducationFaq::create([
            'question' => strip_tags(trim((string) $request->input('question'))),
            'answer' => strip_tags(trim((string) $request->input('answer'))),
            'sort_order' => (int) $request->input('sort_order', 0),
            'is_active' => $request->has('is_active') ? $request->boolean('is_active') : true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pertanyaan FAQ berhasil ditambahkan.',
            'faq' => $faq,
        ], 201);
    }

    /**
     * Update an existing FAQ item.
     */
    public function updateFaq(Request $request, int $id): JsonResponse
    {
        $faq = EducationFaq::find($id);
        if (! $faq) {
            return response()->json([
                'success' => false,
                'message' => 'Pertanyaan FAQ tidak ditemukan.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'question' => ['required', 'string', 'max:255'],
            'answer' => ['required', 'string', 'max:5000'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi perubahan FAQ gagal.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $faq->update([
            'question' => strip_tags(trim((string) $request->input('question'))),
            'answer' => strip_tags(trim((string) $request->input('answer'))),
            'sort_order' => (int) $request->input('sort_order', $faq->sort_order),
            'is_active' => $request->has('is_active') ? $request->boolean('is_active') : $faq->is_active,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pertanyaan FAQ berhasil diperbarui.',
            'faq' => $faq->fresh(),
        ]);
    }

    /**
     * Delete an FAQ item.
     */
    public function destroyFaq(int $id): JsonResponse
    {
        $faq = EducationFaq::find($id);
        if (! $faq) {
            return response()->json([
                'success' => false,
                'message' => 'Pertanyaan FAQ tidak ditemukan.',
            ], 404);
        }

        $faq->delete();

        return response()->json([
            'success' => true,
            'message' => 'Pertanyaan FAQ berhasil dihapus.',
        ]);
    }

    /**
     * Generate a unique URL-safe slug for a model.
     */
    private function generateUniqueSlug(string $modelClass, string $text): string
    {
        $base = Str::slug($text) ?: 'edukasi-dbd';
        $slug = $base;
        $counter = 1;

        while ($modelClass::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $counter;
            $counter++;
        }

        return $slug;
    }
}

