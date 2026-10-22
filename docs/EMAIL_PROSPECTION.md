# E-mails de prospection VisiPro — dossier de développement

## Périmètre et sécurité

Cette intégration réutilise Next.js, Auth.js, Prisma et PostgreSQL. Elle ne nécessite ni IA à l'envoi, ni Redis, ni second backend. Le worker est un processus du même projet, indépendant du navigateur et du serveur Next.js.

Les fichiers du clone GitHub et le serveur Ubuntu ne sont pas modifiés par ces travaux. Aucun transfert ni déploiement n'est autorisé implicitement par cette documentation.

L'installation démarre avec la programmation en pause et `EMAIL_DELIVERY_MODE=simulation`. Même si la programmation est activée dans l'interface, ce mode ne contacte aucun fournisseur. Les messages simulés sont indiqués comme tels, sans être comptés comme des acceptations réelles. Ils ne sont jamais rejoués automatiquement en SMTP.

## Utilisation

Le menu **Prospection → E-mails** est accessible aux comptes OWNER et ADMIN. Les droits sont relus en base à chaque action. Les MEMBER ne peuvent ni consulter ni modifier ce module.

- Importer par API ou créer manuellement un brouillon.
- Consulter et modifier le contenu intégral. Toute modification remet le message en brouillon.
- Approuver individuellement ou cocher plusieurs brouillons (jusqu'à 100 par opération ; 50 par page).
- Choisir éventuellement une date « pas avant », exprimée dans le fuseau configuré. Le créneau final respecte aussi les autres contraintes. Les heures inexistantes ou ambiguës lors d'un changement d'heure sont rejetées.
- Activer la programmation dans les paramètres. Valeurs initiales : 300 minutes, 2 tentatives par jour, lundi–vendredi, 09:00–18:00, Europe/Paris.
- Suivre les acceptations, simulations, refus et résultats incertains depuis les fiches des messages.

L'approbation prévoit au minimum cinq minutes avant l'éligibilité. Chaque sauvegarde des paramètres, y compris une reprise, impose au minimum un intervalle complet avant un nouveau départ. Les créneaux affichés sont des estimations : ils peuvent être repoussés après une tentative, une panne, une pause ou une modification de configuration.

Une pause ou exclusion enregistrée avant la réservation bloque le départ. Une transmission déjà engagée ne peut pas être rappelée. L'interface le précise.

Une adresse ne peut avoir qu'un message dans ce module, même après suppression de son contenu. C'est un choix conservateur pour éviter les contacts multiples ; aucune campagne de relances automatiques n'est implémentée. Un retour en brouillon après un échec peut être validé à nouveau sur la même fiche. Une réponse reçue doit être signalée manuellement ; elle bloque les prochaines sollicitations via la liste d'exclusion.

## Configuration locale

Utiliser un `.env` local non versionné, dérivé de `.env.example`. Ne jamais utiliser l'URL de la base de production pour les tests. Générer des secrets distincts d'au moins 32 caractères pour :

- `AUTH_SECRET` : sessions du dashboard.
- `EMAIL_IMPORT_API_KEY` : authentification de l'IA importatrice.
- `EMAIL_RECIPIENT_HASH_SECRET` : empreinte HMAC des adresses, commune au dashboard et aux workers. Ne pas changer cette valeur sans migration des empreintes : cela casserait la détection des doublons et des exclusions.
- `EMAIL_UNSUBSCRIBE_SECRET` : signature des liens d'opposition. Préserver cette valeur pour que les liens déjà envoyés restent valables.

Le fournisseur réel et l'adresse expéditrice restent à confirmer avec le propriétaire du projet. L'adaptateur SMTP est prêt mais n'a pas été testé auprès d'un fournisseur réel. Il demande : `EMAIL_FROM`, `EMAIL_REPLY_TO`, `EMAIL_SENDER_IDENTITY` (identité et coordonnées professionnelles), `EMAIL_PUBLIC_URL` (HTTPS), `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`.

Le mode SMTP exige simultanément `EMAIL_DELIVERY_MODE=smtp`, `EMAIL_REAL_SEND_ENABLED=true`, une configuration complète et une programmation active. Son activation réelle nécessite l'autorisation du propriétaire. Tous les processus doivent utiliser les mêmes valeurs. Le changement de mode remet les messages approuvés pour un autre mode en brouillon lors du prochain recalcul, avant toute transmission.

Le transport utilise TLS obligatoire et des délais de connexion et d'inactivité. Aucun HTML, pièce jointe, chargement de fichier ou chargement d'URL n'est accepté par l'API de brouillons. Les URLs de site et de maquette sont des métadonnées : si le lien doit figurer dans le message, l'IA doit l'inclure dans le texte.

L'alias npm `visipro-smtp` désigne Nodemailer 10.2 ou ultérieur. Il isole la version corrigée utilisée par le worker des contraintes du fournisseur e-mail optionnel d'Auth.js, qui n'est pas utilisé (la connexion reste Credentials).

## API d'import

`POST /api/email-drafts`, avec `Content-Type: application/json` et `Authorization: Bearer <EMAIL_IMPORT_API_KEY>`.

Exemple de corps JSON (données fictives) :

```json
{
  "idempotencyKey": "prospect:identifiant-stable:v1",
  "companyName": "Entreprise Exemple",
  "recipient": "contact@example.test",
  "subject": "Votre présence en ligne",
  "body": "Bonjour, voici une proposition adaptée à votre activité…",
  "companyUrl": "https://example.test",
  "mockupUrl": "https://maquette.example.test",
  "personalization": "Constats précis ayant servi à personnaliser le message"
}
```

`prospectId` est facultatif ; s'il est fourni, il doit désigner un prospect existant. Aucun champ `status`, `approvedAt` ou de programmation n'est accepté.

- `201` : brouillon créé.
- `200` : clé d'idempotence déjà importée avec le même contenu ; aucun nouveau message.
- `400` : données invalides ou champs non autorisés.
- `401` : clé incorrecte.
- `409` : destinataire déjà présent/exclu ou clé réutilisée avec un autre contenu.
- `413` : corps supérieur à 48 Kio.
- `415` : type de contenu incorrect.
- `429` : 60 imports authentifiés en 15 minutes atteints ; compteur PostgreSQL commun aux instances et persistant après redémarrage.
- `503` : configuration ou stockage indisponible.

Cette route fait exception au middleware de connexion navigateur et applique sa propre authentification par clé. Elle ne possède aucune capacité d'approbation ou d'envoi. Les erreurs ne renvoient ni les secrets ni le contenu complet du message.

## Worker et cohérence

Commande : `npm run email:worker`. Boucle toutes les 30 secondes, sans appel à une IA. Le fichier `visipro-email-worker.service.template` est un modèle systemd de développement ; aucun service n'a été installé ou activé sur Ubuntu.

Chaque mutation du module et chaque réservation prennent le même verrou transactionnel PostgreSQL. Un seul message est en transmission à la fois, même avec plusieurs workers. La réservation et la création de la tentative sont atomiques ; le réseau est appelé hors transaction.

Les tentatives consomment toutes l'intervalle et le quota, y compris les refus et simulations. Le délai est compté depuis la plus tardive des dates de départ et de fin de la dernière tentative. Les quotas utilisent la date locale du fuseau configuré ; les durées utilisent des instants UTC.

- Refus SMTP explicite 4xx : nouvelle tentative après un délai au moins égal à l'intervalle, avec temporisation croissante ; trois refus temporaires maximum avant blocage.
- Refus explicite 5xx : échec définitif, sans nouvelle tentative automatique.
- Erreur réseau sans résultat certain : échec nécessitant un contrôle manuel.
- Tentative restée en cours plus de cinq minutes après interruption : résultat incertain ; jamais remise automatiquement en file.
- Réponse tardive d'un ancien worker : ne remplace pas une tentative déjà classée incertaine ou réconciliée.

Après un résultat incertain, l'administrateur doit vérifier les journaux du fournisseur avec l'identifiant de tentative utilisé comme Message-ID SMTP. Il peut confirmer l'acceptation ou confirmer l'absence d'acceptation pour remettre en brouillon. Cette dernière action exige une nouvelle approbation avant tout départ. SMTP ne garantit pas une livraison « exactement une fois » ; aucun mécanisme ne prétend le contraire.

`sent` signifie « accepté par le fournisseur », pas « livré dans la boîte ». Il n'existe pas encore de synchronisation des rebonds, de suivi de livraison ou de lecture automatique des réponses.

## Données, migrations et sauvegarde

Tables ajoutées : `email_queue`, `email_settings`, `email_send_attempts`, `email_suppressions`, `email_api_rate_limits`. Les journaux utilisent aussi `AuditLog` existant.

Deux migrations sont fournies :

1. `20261022000100_existing_schema` : baseline du schéma historique.
2. `20261022000200_email_prospection` : ajout des tables et types e-mails uniquement.

Le banc de test applique les deux migrations à une base vide. Sur une base existante créée avec `db push`, il faudra sauvegarder et tester une restauration, vérifier la correspondance exacte du schéma, puis déclarer la baseline déjà appliquée avant d'appliquer la migration additive. Ne jamais exécuter la baseline de création sur une base contenant déjà les tables, ni utiliser `migrate reset`, `db push --accept-data-loss` ou le seed de démonstration sur la production. Les instructions de transfert et de déploiement seront préparées après autorisation distincte.

La sauvegarde doit inclure PostgreSQL et les secrets dans un stockage séparé et protégé. Les exclusions et paramètres font partie de la base et survivent aux redémarrages. Les modifications d'interface utilisent une version du message ou une révision des paramètres pour rejeter les formulaires obsolètes.

## Opposition et conservation

Un pied de message identifie VisiPro et ajoute un lien d'opposition signé, ainsi que la possibilité de répondre. Le lien fonctionne sans connexion. Une consultation seule ne change rien : le destinataire confirme son opposition, évitant que les scanners de liens désinscrivent involontairement une adresse. Aucun endpoint public ne peut envoyer un message.

La liste d'exclusion est persistante. Elle conserve une empreinte HMAC, une adresse masquée, un motif et une date. Aucune levée automatique d'exclusion n'est prévue. Il faut informer les personnes de l'usage de leurs données et réserver la prospection B2B aux offres en rapport avec leur activité, avec un moyen simple et gratuit d'opposition : https://www.cnil.fr/la-prospection-commerciale-par-courrier-electronique

Conservation initiale proposée : 90 jours pour les contenus terminés, configurable entre 30 et 1095 jours. Le nettoyage est volontaire, accessible à l'administrateur avec confirmation. Il ne supprime jamais un brouillon ni un résultat incertain automatiquement. Il efface le contenu et les coordonnées des messages terminés éligibles tout en conservant les traces techniques et les empreintes anti-doublon. Le propriétaire doit documenter la durée des traces et réexaminer les brouillons restants. La CNIL recommande notamment au moins trois ans pour les informations nécessaires à l'opposition : https://www.cnil.fr/fr/questions-reponses-sur-les-referentiels-relatifs-la-gestion-des-activites-commerciales-et-des

## Tests reproductibles — aucune livraison réelle

```text
npm ci
npm run db:generate
npm run lint
npm run test:unit
npm run test:email
npm run test:email:browser
```

`test:email` crée un vrai serveur PostgreSQL temporaire sur 127.0.0.1:15439, une base au nom aléatoire et des secrets aléatoires. Il applique les migrations et exécute les tests, puis arrête le serveur. Aucune base existante n'est contactée. Les données de test sont conservées dans `.email-test-data/`, ignoré par Git. Le nettoyage entre tests ne touche que cette base dédiée.

`test:email:browser` effectue aussi un build, démarre Next.js sur 127.0.0.1:15440, utilise un compte de test et contrôle l'import, l'édition, les validations individuelles/multiples, les paramètres, un vrai processus worker en simulation, son redémarrage, l'historique et le lien d'opposition public. Il arrête les processus qu'il a créés. Les captures et logs locaux sont dans `.email-test-results/`, ignoré par Git. Microsoft Edge est utilisé sous Windows ; Chromium doit être installé pour Playwright sous Linux. Les ports doivent être libres ; exécuter un seul banc de test à la fois.

La configuration Vitest se limite aux tests du dashboard dans `tests/`. Les projets autonomes présents sous `prospection/` dans le dossier Desktop gardent leurs propres scripts et sont exclus du lint du dashboard.

Le banc de test vérifie aussi un arrêt/redémarrage effectif de PostgreSQL et la préservation d'un client fictif préexistant lors de la migration additive.

Correction d'authentification : le middleware historique à la racine n'était pas chargé avec cette structure `src/app`. Il réside maintenant dans `src/middleware.ts`, avec une configuration de session partagée indépendante de Prisma. Le test navigateur vérifie réellement la redirection anonyme et les exceptions d'import/opposition.
