<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\Medicament;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Comptes de démonstration
        User::create([
            'name' => 'Administrateur Démo',
            'email' => 'admin@phabot.test',
            'password' => 'password',
            'role' => Role::Admin,
        ]);

        User::create([
            'name' => 'Pharmacien Démo',
            'email' => 'pharmacien@phabot.test',
            'password' => 'password',
            'role' => Role::Pharmacien,
        ]);

        $profil = \App\Models\ProfilMedical::create([
            'allergies' => 'paracétamol',
            'age' => 34,
            'antecedents' => 'Aucun antécédent notable.',
        ]);

        User::create([
            'name' => 'Patient Démo',
            'email' => 'patient@phabot.test',
            'password' => 'password',
            'role' => Role::Patient,
            'profil_medical_id' => $profil->id,
        ]);

        // Catalogue de démonstration (aligné sur les fiches du microservice IA)
        $medicaments = [
            ['code_barre' => '3400930000001', 'designation' => 'Doliprane 1000 mg', 'quantite_stock' => 120, 'prix' => 2.18, 'description_technique' => 'Paracétamol 1000 mg, antalgique/antipyrétique.'],
            ['code_barre' => '3400930000002', 'designation' => 'Amoxicilline 500 mg', 'quantite_stock' => 60, 'prix' => 4.50, 'description_technique' => 'Antibiotique pénicilline, sur ordonnance.'],
            ['code_barre' => '3400930000003', 'designation' => 'Ibuprofène 400 mg', 'quantite_stock' => 90, 'prix' => 2.90, 'description_technique' => 'AINS, anti-inflammatoire.'],
        ];

        foreach ($medicaments as $m) {
            Medicament::create($m);
        }
    }
}
