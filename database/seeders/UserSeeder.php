<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Seed realistic OPD and Puskesmas accounts in Kabupaten Banyumas.
     */
    public function run(): void
    {
        $defaultPassword = Hash::make('AdminBanyumas2026!');

        $users = [
            [
                'name' => 'Dr. Hendra Wijaya, M.Kes',
                'username' => 'hendra_wijaya',
                'email' => 'hendra.wijaya@dinkes.banyumaskab.go.id',
                'role' => 'admin',
                'is_active' => true,
                'agency' => 'Bidang P2P Dinas Kesehatan Kabupaten Banyumas',
                'phone' => '+62 812-3456-7891',
                'bio' => 'Kepala Bidang Pencegahan dan Pengendalian Penyakit (P2P).',
            ],
            [
                'name' => 'Rina Marlina, S.KM',
                'username' => 'rina_marlina',
                'email' => 'rina.marlina@dinkes.banyumaskab.go.id',
                'role' => 'admin',
                'is_active' => true,
                'agency' => 'Seksi Surveilans dan Imunisasi Dinkes Banyumas',
                'phone' => '+62 813-2345-6789',
                'bio' => 'Petugas verifikasi pelaporan mingguan dan bulanan kasus DBD.',
            ],
            [
                'name' => 'Budi Santoso, S.Kep',
                'username' => 'budi_santoso',
                'email' => 'surveilans.purwokertotimur@banyumaskab.go.id',
                'role' => 'user',
                'is_active' => true,
                'agency' => 'Puskesmas Purwokerto Timur I',
                'phone' => '+62 856-4321-0987',
                'bio' => 'Koordinator penginputan data kasus DBD wilayah Purwokerto Timur.',
            ],
            [
                'name' => 'Siti Rahmawati, A.Md.Keb',
                'username' => 'siti_rahmawati',
                'email' => 'surveilans.baturraden@banyumaskab.go.id',
                'role' => 'user',
                'is_active' => true,
                'agency' => 'Puskesmas Baturraden I',
                'phone' => '+62 815-6789-0123',
                'bio' => 'Pengelola pelaporan PE (Penyelidikan Epidemiologi) Baturraden.',
            ],
            [
                'name' => 'Ahmad Fauzi, S.Kep',
                'username' => 'ahmad_fauzi',
                'email' => 'surveilans.wangon@banyumaskab.go.id',
                'role' => 'user',
                'is_active' => false,
                'agency' => 'Puskesmas Wangon I',
                'phone' => '+62 878-1234-5678',
                'bio' => 'Akun dinonaktifkan sementara karena mutasi tugas ke unit rawat jalan.',
            ],
            [
                'name' => 'Dewi Lestari, S.KM',
                'username' => 'dewi_lestari',
                'email' => 'surveilans.sokaraja@banyumaskab.go.id',
                'role' => 'user',
                'is_active' => true,
                'agency' => 'Puskesmas Sokaraja I',
                'phone' => '+62 821-3456-7890',
                'bio' => 'Petugas sanitarian dan surveilans wilayah Sokaraja.',
            ],
            [
                'name' => 'Eko Prasetyo, S.Kep',
                'username' => 'eko_prasetyo',
                'email' => 'surveilans.ajibarang@banyumaskab.go.id',
                'role' => 'user',
                'is_active' => false,
                'agency' => 'Puskesmas Ajibarang II',
                'phone' => '+62 812-9876-5432',
                'bio' => 'Akun dalam proses peralihan kepengurusan surveilans kecamatan.',
            ],
            [
                'name' => 'Maya Indah Sari, A.Md.Keb',
                'username' => 'maya_indah',
                'email' => 'surveilans.sumbang@banyumaskab.go.id',
                'role' => 'user',
                'is_active' => true,
                'agency' => 'Puskesmas Sumbang I',
                'phone' => '+62 857-1234-9876',
                'bio' => 'Pelaksana pelaporan DBD dan jumantik wilayah Sumbang.',
            ],
            [
                'name' => 'Tri Wulandari, S.KM',
                'username' => 'tri_wulandari',
                'email' => 'surveilans.cilongok@banyumaskab.go.id',
                'role' => 'user',
                'is_active' => true,
                'agency' => 'Puskesmas Cilongok I',
                'phone' => '+62 813-9876-1234',
                'bio' => 'Penanggung jawab data epidemiologi DBD Cilongok.',
            ],
            [
                'name' => 'Bambang Susilo, S.Kep',
                'username' => 'bambang_susilo',
                'email' => 'surveilans.kembaran@banyumaskab.go.id',
                'role' => 'user',
                'is_active' => true,
                'agency' => 'Puskesmas Kembaran I',
                'phone' => '+62 877-6543-2109',
                'bio' => 'Petugas surveilans DBD wilayah kerja Kecamatan Kembaran.',
            ],
            [
                'name' => 'Nur Hidayah, S.KM',
                'username' => 'nur_hidayah',
                'email' => 'surveilans.rawalo@banyumaskab.go.id',
                'role' => 'user',
                'is_active' => true,
                'agency' => 'Puskesmas Rawalo',
                'phone' => '+62 812-4567-8901',
                'bio' => 'Pelaksana surveilans kewaspadaan dini KLB DBD Rawalo.',
            ],
        ];

        foreach ($users as $userData) {
            User::firstOrCreate(
                ['email' => $userData['email']],
                array_merge($userData, [
                    'password' => $defaultPassword,
                    'email_verified_at' => now(),
                ])
            );
        }
    }
}

