describe('Fitur 4 & 5 — Peta WebGIS Choropleth & Filter Periode Spasial-Temporal Banyumas E2E', () => {
  beforeEach(() => {
    cy.viewport(1280, 800);
  });

  it('1. Dapat diakses publik tanpa login dan menampilkan header, navigasi, serta filter', () => {
    cy.visit('/peta');
    cy.contains('Peta Persebaran DBD Kabupaten Banyumas').should('be.visible');
    cy.contains('Dashboard Publik').should('be.visible');
    cy.get('select#filter-tahun').should('be.visible');
    cy.get('select#filter-bulan').should('be.visible');
    cy.contains('Data Simulasi Pengembangan').should('be.visible');
    cy.contains('Reset Tampilan').should('be.visible');
  });

  it('2. Menampilkan 4 kartu ringkasan cepat epidemiologi dengan data awal Januari 2026 (143 kasus)', () => {
    cy.visit('/peta');

    cy.contains('Total Kejadian DBD').should('be.visible');
    cy.contains('143').should('be.visible');
    cy.contains('Cakupan Wilayah').should('be.visible');
    cy.contains('27').should('be.visible');
    cy.contains('Prioritas Pemantauan').closest('.bg-white').should('contain', '5');
    cy.contains('Kasus Maksimal').closest('.bg-white').should('contain', '19');
  });

  it('3. Menampilkan Leaflet map container, layer OpenStreetMap, dan kontrol zoom', () => {
    cy.visit('/peta');

    cy.get('.leaflet-container').should('exist').and('be.visible');
    cy.get('.leaflet-tile-pane').should('exist');
    cy.get('.leaflet-control-zoom-in').should('exist');
    cy.get('.leaflet-control-zoom-out').should('exist');
    cy.get('.leaflet-control-attribution').should('contain', 'OpenStreetMap');
  });

  it('4. Memuat GeoJSON 27 batas kecamatan Banyumas dengan polygon interaktif', () => {
    cy.visit('/peta');

    cy.get('path.leaflet-interactive', { timeout: 10000 }).should('have.length', 27);
    cy.contains('Batas Administrasi 27 Kecamatan:').should('be.visible');
    cy.contains('Terpetakan Lengkap').should('be.visible');
  });

  it('5. Menampilkan legenda klasifikasi choropleth dengan 4 tingkatan dan state no-data', () => {
    cy.visit('/peta');

    cy.contains('Legenda Klasifikasi Choropleth').should('be.visible');
    cy.contains('0 Kasus (Nol Kasus)').should('be.visible');
    cy.contains('1 – 4 Kasus').should('be.visible');
    cy.contains('5 – 9 Kasus').should('be.visible');
    cy.contains('≥ 10 Kasus (Prioritas Pemantauan)').should('be.visible');
    cy.contains('Data Belum Tersedia').should('be.visible');
  });

  it('6. Menampilkan catatan ilmiah tentang metode pemetaan dan larangan klaim hotspot statistik', () => {
    cy.visit('/peta');

    cy.contains('Keterangan Metode Pemetaan').should('be.visible');
    cy.contains('Wilayah Prioritas Pemantauan').should('be.visible');
    cy.contains('Catatan Ilmiah:').should('be.visible');
    cy.contains('Sistem tidak menyebut warna merah sebagai hotspot signifikan secara statistik').should('be.visible');
    cy.contains('Etika & Privasi Data').should('be.visible');
  });

  it('7. Fitur 5: Mengubah filter bulan ke Februari memperbarui angka kasus (98) dan prioritas (3)', () => {
    cy.visit('/peta');
    cy.contains('143').should('be.visible');

    // Switch month to Februari (value "2")
    cy.get('select#filter-bulan').should('not.be.disabled').select('2');

    // Stats update dynamically
    cy.contains('98').should('be.visible');
    cy.contains('Periode: Februari 2026').should('be.visible');
    cy.contains('Prioritas Pemantauan').closest('.bg-white').should('contain', '3');
    cy.contains('Kasus Maksimal').closest('.bg-white').should('contain', '15');
  });

  it('8. Fitur 5: Mengubah filter bulan ke Maret memperbarui angka kasus (64) dan prioritas (1)', () => {
    cy.visit('/peta');
    cy.contains('143').should('be.visible');

    // Switch month to Maret (value "3")
    cy.get('select#filter-bulan').should('not.be.disabled').select('3');

    // Stats update dynamically
    cy.contains('64').should('be.visible');
    cy.contains('Periode: Maret 2026').should('be.visible');
    cy.contains('Prioritas Pemantauan').closest('.bg-white').should('contain', '1');
    cy.contains('Kasus Maksimal').closest('.bg-white').should('contain', '11');
  });

  it('9. Fitur 5: Memilih "Semua Bulan Tersedia" menghitung akumulasi tahun berjalan (305 kasus)', () => {
    cy.visit('/peta');
    cy.contains('143').should('be.visible');

    // Select "Semua Bulan Tersedia" (value "all")
    cy.get('select#filter-bulan').should('not.be.disabled').select('all');

    // Check cumulative results
    cy.contains('305').should('be.visible'); // Jan (143) + Feb (98) + Mar (64) = 305
    cy.contains('Akumulasi: Januari – Maret 2026').should('be.visible');
    cy.contains('Prioritas Pemantauan').closest('.bg-white').should('contain', '12');
    cy.contains('Kasus Maksimal').closest('.bg-white').should('contain', '35');
  });

  it('10. Fitur 5: Mengubah pilihan tahun ke 2025 memuat periode tahun 2025', () => {
    cy.visit('/peta');
    cy.contains('143').should('be.visible');

    // Select year 2025
    cy.get('select#filter-tahun').should('not.be.disabled').select('2025');

    // Month dropdown now contains 2025 months
    cy.get('select#filter-bulan').should('contain', 'Desember');
    cy.get('select#filter-bulan').should('contain', 'November');

    // Select Desember 2025 (value "12")
    cy.get('select#filter-bulan').should('not.be.disabled').select('12');
    cy.contains('82').should('be.visible');
    cy.contains('Periode: Desember 2025').should('be.visible');
  });

  it('11. Fitur 5: Menangani empty state jika data periode belum tersedia', () => {
    // Intercept empty response simulation
    cy.intercept('GET', '/api/public/map?*', {
      statusCode: 200,
      body: {
        success: true,
        has_data: false,
        message: 'Data kasus belum tersedia untuk periode November 2026.',
        period: null,
        summary: {
          total_cases: null,
          subdistricts_count: 0,
          priority_count: 0,
          max_cases: 0,
        },
        districts: [],
      },
    }).as('getEmptyMap');

    cy.visit('/peta');
    cy.get('select#filter-bulan').select('all');
    cy.wait('@getEmptyMap');

    cy.contains('Data Kasus Belum Tersedia').should('be.visible');
    cy.contains('Tidak Ada Data').should('be.visible');
  });

  it('12. Interaksi klik pada poligon menampilkan overlay kartu detail kecamatan terpilih', () => {
    cy.visit('/peta');

    cy.get('path.leaflet-interactive').first().click({ force: true });
    cy.contains('Detail Terpilih').should('be.visible');
    cy.contains('Kecamatan').should('be.visible');
    cy.contains('Jumlah Kasus:').should('be.visible');
    cy.contains('Incidence Rate:').should('be.visible');

    cy.contains('button', '✕').click();
    cy.contains('Detail Terpilih').should('not.exist');
  });

  it('13. Tombol Reset Tampilan berfungsi dan mengembalikan status', () => {
    cy.visit('/peta');

    cy.get('path.leaflet-interactive').eq(2).click({ force: true });
    cy.contains('Detail Terpilih').should('be.visible');

    cy.contains('Reset Tampilan').click();
    cy.contains('Detail Terpilih').should('not.exist');
  });

  it('14. Memastikan isolasi ketat data internal Dinkes 117 kasus', () => {
    cy.visit('/peta');

    cy.contains('INTERNAL_BELUM_DIIZINKAN').should('not.exist');
    cy.contains('Data Dinkes Internal').should('not.exist');
    cy.get('select#filter-bulan').should('not.contain', 'Oktober'); // internal period unreleased
  });

  it('15. Memiliki navigasi kembali ke Dashboard Publik', () => {
    cy.visit('/peta');
    cy.contains('Dashboard Publik').click();
    cy.url().should('include', '/dashboard');
    cy.contains('Dashboard Pemantauan DBD').should('be.visible');
  });

  it('16. Menangani error state secara graceful jika API peta gagal', () => {
    cy.intercept('GET', '/api/public/map?*', {
      statusCode: 500,
      body: { message: 'Internal Server Error' },
    }).as('getMapError');

    cy.visit('/peta');
    cy.get('select#filter-bulan').should('not.be.disabled').select('all');
    cy.wait('@getMapError');
    cy.contains('Gagal Menampilkan Peta WebGIS').should('be.visible');
    cy.contains('Coba Muat Ulang').should('be.visible');
  });

  it('17. Mengambil snapshot visual peta dengan filter periode spasial-temporal', () => {
    cy.visit('/peta');
    cy.get('select#filter-bulan').should('not.be.disabled').select('all');
    cy.contains('Akumulasi: Januari – Maret 2026').should('be.visible');
    cy.get('path.leaflet-interactive', { timeout: 10000 }).should('have.length', 27);
    cy.wait(1500);
    cy.screenshot('peta_filter_periode_akumulasi', { capture: 'viewport' });
  });
});
