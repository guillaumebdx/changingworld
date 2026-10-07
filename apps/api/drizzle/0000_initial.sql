CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nom` text NOT NULL,
	`couleur` text NOT NULL,
	`ordre` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_nom_unique` ON `categories` (`nom`);--> statement-breakpoint
CREATE TABLE `formats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`nom` text NOT NULL,
	`gabarit` text,
	`exemple` text,
	`reponses` text,
	`ressort` text,
	`actif` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `formats_code_unique` ON `formats` (`code`);--> statement-breakpoint
CREATE TABLE `prompt_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prompt_id` integer NOT NULL,
	`version` integer NOT NULL,
	`contenu` text NOT NULL,
	`note_de_version` text,
	`active` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_prompt_versions_prompt` ON `prompt_versions` (`prompt_id`);--> statement-breakpoint
CREATE TABLE `prompts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`format_id` integer,
	`nom` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`format_id`) REFERENCES `formats`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `question_historique` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question_id` integer NOT NULL,
	`snapshot` text NOT NULL,
	`auteur` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_historique_question` ON `question_historique` (`question_id`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`numero` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`categorie_id` integer NOT NULL,
	`sous_categorie_id` integer NOT NULL,
	`format_id` integer NOT NULL,
	`impact` text DEFAULT 'INTERESSANT' NOT NULL,
	`question` text DEFAULT '' NOT NULL,
	`reponse_a` text DEFAULT '' NOT NULL,
	`reponse_b` text DEFAULT '' NOT NULL,
	`reponse_c` text DEFAULT '' NOT NULL,
	`bonne_reponse` text DEFAULT 'a' NOT NULL,
	`indice_1` text DEFAULT '' NOT NULL,
	`indice_2` text DEFAULT '' NOT NULL,
	`indice_3` text DEFAULT '' NOT NULL,
	`commentaire` text DEFAULT '' NOT NULL,
	`source_nom` text DEFAULT '' NOT NULL,
	`source_lien` text DEFAULT '' NOT NULL,
	`fait` text DEFAULT '' NOT NULL,
	`chiffres` text DEFAULT '' NOT NULL,
	`calculs` text DEFAULT '' NOT NULL,
	`resultat` text DEFAULT '' NOT NULL,
	`statut` text DEFAULT 'brouillon_ia' NOT NULL,
	`date_examen` text,
	`commentaire_interne` text,
	`prompt_version_id` integer,
	`modele_ia` text,
	FOREIGN KEY (`categorie_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sous_categorie_id`) REFERENCES `sous_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`format_id`) REFERENCES `formats`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`prompt_version_id`) REFERENCES `prompt_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `questions_numero_unique` ON `questions` (`numero`);--> statement-breakpoint
CREATE INDEX `idx_questions_statut` ON `questions` (`statut`);--> statement-breakpoint
CREATE INDEX `idx_questions_sous_categorie` ON `questions` (`sous_categorie_id`);--> statement-breakpoint
CREATE INDEX `idx_questions_format` ON `questions` (`format_id`);--> statement-breakpoint
CREATE TABLE `reglages` (
	`cle` text PRIMARY KEY NOT NULL,
	`valeur` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sous_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`categorie_id` integer NOT NULL,
	`nom` text NOT NULL,
	`nb_questions_cible` integer,
	`ordre` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`categorie_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sous_categories_categorie` ON `sous_categories` (`categorie_id`);