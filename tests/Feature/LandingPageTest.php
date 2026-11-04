<?php

namespace Tests\Feature;

use Tests\TestCase;

class LandingPageTest extends TestCase
{
    /**
     * Test that the root route successfully renders the SPA entry point.
     */
    public function test_landing_page_renders_successfully(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
        $response->assertSee('<div id="root"></div>', false);
        $response->assertSee('WebGIS DBD Banyumas');
    }

    /**
     * Test that SPA routes like /dashboard and /login are served by the app layout.
     */
    public function test_spa_subroutes_are_handled_by_blade_entry_point(): void
    {
        $dashboardResponse = $this->get('/dashboard');
        $dashboardResponse->assertStatus(200);
        $dashboardResponse->assertSee('<div id="root"></div>', false);

        $loginResponse = $this->get('/login');
        $loginResponse->assertStatus(200);
        $loginResponse->assertSee('<div id="root"></div>', false);
    }

    /**
     * Test that api routes are not swallowed by the SPA fallback route.
     */
    public function test_api_routes_are_excluded_from_spa_fallback(): void
    {
        $response = $this->get('/api/unregistered-endpoint');

        $response->assertStatus(404);
    }
}
