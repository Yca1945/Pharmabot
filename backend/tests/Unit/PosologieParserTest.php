<?php

namespace Tests\Unit;

use App\Services\PosologieParser;
use PHPUnit\Framework\TestCase;

class PosologieParserTest extends TestCase
{
    private PosologieParser $parser;

    protected function setUp(): void
    {
        $this->parser = new PosologieParser();
    }

    public function test_frequence_numerique(): void
    {
        $this->assertSame(['08:00', '14:00', '20:00'], $this->parser->heures('3 fois par jour'));
        $this->assertSame(['08:00'], $this->parser->heures('1 fois par jour'));
    }

    public function test_moments_textuels(): void
    {
        $this->assertSame(['08:00', '20:00'], $this->parser->heures('matin et soir'));
        $this->assertSame(['12:00'], $this->parser->heures('le midi'));
    }

    public function test_intervalle_horaire(): void
    {
        // toutes les 6 heures -> 4 prises
        $this->assertCount(4, $this->parser->heures('toutes les 6 heures'));
    }

    public function test_defaut_une_prise(): void
    {
        $this->assertSame(['08:00'], $this->parser->heures(null));
        $this->assertSame(['08:00'], $this->parser->heures('au besoin'));
    }
}
