<?php

namespace Tests\Unit;

use App\Models\Medicament;
use App\Models\ProfilMedical;
use App\Services\AlerteService;
use PHPUnit\Framework\TestCase;

class AlerteServiceTest extends TestCase
{
    private function med(string $designation, string $desc = ''): Medicament
    {
        $m = new Medicament();
        $m->designation = $designation;
        $m->description_technique = $desc;

        return $m;
    }

    private function profil(?string $allergies): ProfilMedical
    {
        $p = new ProfilMedical();
        $p->allergies = $allergies;

        return $p;
    }

    public function test_detecte_une_contre_indication(): void
    {
        $service = new AlerteService();
        $meds = [
            $this->med('Doliprane 1000 mg', 'Paracétamol, antalgique. Allergie au paracétamol.'),
        ];

        $alertes = $service->pourMedicaments($this->profil('paracétamol'), $meds);

        $this->assertCount(1, $alertes);
        $this->assertSame('Doliprane 1000 mg', $alertes[0]['medicament']);
    }

    public function test_aucune_alerte_si_pas_de_correspondance(): void
    {
        $service = new AlerteService();
        $meds = [$this->med('Amoxicilline 500 mg', 'Pénicilline.')];

        $this->assertSame([], $service->pourMedicaments($this->profil('aspirine'), $meds));
    }

    public function test_aucune_alerte_sans_profil(): void
    {
        $service = new AlerteService();
        $meds = [$this->med('Doliprane', 'paracétamol')];

        $this->assertSame([], $service->pourMedicaments(null, $meds));
        $this->assertSame([], $service->pourMedicaments($this->profil(null), $meds));
    }

    public function test_plusieurs_allergies_separees_par_virgule(): void
    {
        $service = new AlerteService();
        $meds = [
            $this->med('Amoxicilline 500 mg', 'Antibiotique pénicilline.'),
            $this->med('Aspirine 500 mg', 'Acide acétylsalicylique.'),
        ];

        $alertes = $service->pourMedicaments($this->profil('pénicilline, aspirine'), $meds);

        $this->assertCount(2, $alertes);
    }
}
