describe('Fitur 3 — Dashboard Publik E2E Test', () => {
  it('berhasil membuka dashboard publik tanpa autentikasi / login', () => {
    cy.visit('/dashboard');
    cy.contains('Dashboard Pemantauan DBD').should('be.visible');
    cy.contains('Data Simulasi Pengembangan').should('be.visible');
  });

  it('menampilkan 4 kartu ringkasan epidemiologi dengan data dinamis dari API', () => {
    cy.visit('/dashboard');

    // 1. Total kasus
    cy.contains('Total Kasus DBD').should('be.visible');
    cy.contains('Kasus').should('be.visible');

    // 2. Cakupan Wilayah
    cy.contains('Cakupan Wilayah').should('be.visible');
    cy.contains('27 Kecamatan').should('be.visible');

    // 3. Kasus Tertinggi
    cy.contains('Kasus Tertinggi').should('be.visible');
    cy.contains('Purwokerto Selatan').should('be.visible');

    // 4. Kecamatan Ada Kasus
    cy.contains('Kecamatan Ada Kasus').should('be.visible');
  });

  it('menampilkan daftar distribusi kasus kecamatan dengan horizontal bar dan status prioritas', () => {
    cy.visit('/dashboard');

    cy.contains('Distribusi Kasus per Kecamatan').should('be.visible');
    cy.contains('Purwokerto Selatan').should('be.visible');
    cy.contains('Wilayah Prioritas Pemantauan').should('be.visible');

    // Test search filter within distribution list
    cy.get('input[placeholder*="Cari nama kecamatan"]').type('Sokaraja');
    cy.get('input[placeholder*="Cari nama kecamatan"]').should('have.value', 'Sokaraja');
    cy.contains('h2', 'Distribusi Kasus per Kecamatan')
      .closest('.bg-white')
      .within(() => {
        cy.contains('Sokaraja').should('be.visible');
        cy.contains('Purwokerto Selatan').should('not.exist');
      });
  });

  it('menampilkan metadata dataset dan informasi privasi', () => {
    cy.visit('/dashboard');

    cy.contains('Informasi & Keterangan Dataset').should('be.visible');
    cy.contains('Periode Aktif').should('be.visible');
    cy.contains('Januari 2026').should('be.visible');
    cy.contains('Etika & Privasi Data Publik').should('be.visible');
  });

  it('memiliki navigasi fungsional ke Landing Page dan Peta WebGIS', () => {
    cy.visit('/dashboard');

    // Navigasi ke Landing Page
    cy.contains('Beranda').click();
    cy.url().should('eq', Cypress.config().baseUrl + '/');
    cy.contains('WebGIS DBD').should('be.visible');

    // Kembali ke Dashboard dan navigasi ke Peta
    cy.visit('/dashboard');
    cy.contains('Peta WebGIS').click();
    cy.url().should('include', '/peta');
    cy.contains('Peta Persebaran DBD Kabupaten Banyumas').should('be.visible');
  });

  it('memastikan data internal 117 kasus tidak bocor ke antarmuka publik', () => {
    cy.visit('/dashboard');
    cy.contains('Data Simulasi Pengembangan').should('be.visible');
    cy.contains('143').should('be.visible');
    cy.contains('INTERNAL_BELUM_DIIZINKAN').should('not.exist');
    cy.contains('Data Dinkes Internal').should('not.exist');
  });

  it('menangani skenario error state jika API gagal merespons', () => {
    cy.intercept('GET', '/api/public/dashboard/summary', {
      statusCode: 500,
      body: { message: 'Internal Server Error' },
    }).as('getSummaryError');

    cy.visit('/dashboard');
    cy.wait('@getSummaryError');
    cy.contains('Gagal Memuat Data').should('be.visible');
    cy.contains('Coba Muat Ulang').should('be.visible');
  });
});
