# SID Backend API

API REST pour la plateforme Job Fair, construite avec Node.js, Express et MongoDB.

## Installation et démarrage

```bash
npm install
npm run dev
```

## Administration et salons de l'emploi

Les routes du tableau de bord nécessitent un jeton Bearer valide associé à un
utilisateur ayant le rôle `ADMIN` :

- `GET /api/admin/news` liste les actualités publiées et les brouillons.
- `GET /api/admin/stats` retourne les nombres d'offres, candidatures, actualités
  et salons calculés à partir de MongoDB.
- `GET /api/admin/ai-insights?days=7|30|90` analyse les messages de l'assistant
  sur la période demandée (7 jours par défaut).
- `DELETE /api/news/:id` autorise également l'administrateur à supprimer toute
  actualité, même si elle appartient à une autre entreprise.

`GET /api/job-fairs` liste les salons stockés dans la collection `jobfairs`.
Chaque document contient un nom, un lieu, un organisateur, des dates de début et
de fin, ainsi que les nombres d'entreprises et de participants. Les recruteurs
peuvent utiliser `GET /api/jobs/mine` pour afficher toutes leurs offres, y
compris celles qui sont fermées.

### `POST /api/job-fairs`

Réservée à `ADMIN`. `name`, `location`, `organizer`, `startDate` et `endDate`
sont requis; les dates doivent être ISO 8601. `companiesCount` et
`participantsCount` sont des entiers facultatifs supérieurs ou égaux à zéro.

```json
{
  "name": "Salon de l'emploi 2026",
  "location": "Sfax",
  "organizer": "JCI Sfax",
  "startDate": "2026-11-10T09:00:00.000Z",
  "endDate": "2026-11-10T17:00:00.000Z",
  "companiesCount": 20,
  "participantsCount": 300
}
```

Réponse `201` : salon créé.

## Intégration SID_Agent et indexation

Le backend relaie la façade et les workflows autorisés de SID_Agent sous
`/api/ai`, sans remplacer les routes métier déjà présentes. L'inventaire complet
des méthodes, chemins et rôles figure ci-dessous. Les opérations privées au
service, dont la synchronisation immédiate des index, sont appelées par le worker
et ne sont pas exposées comme routes utilisateur du proxy.

Les routes IA contrôlent le jeton et les rôles dans SID_Backend, puis transmettent
l'identifiant MongoDB vérifié (`X-Platform-User-Id`) avec la clé de service.
SID_Agent vérifie cette clé avant d'accepter l'identifiant et recharge le rôle et
le statut du compte depuis la base partagée; aucun JWT n'est validé dans SID_Agent.
Les opérations réservées au service sont limitées à `ADMIN`.
Configurer `SID_AGENT_URL` (URL de base du service, sans suffixe `/api`),
`SID_SERVICE_API_KEY` (même valeur que SID_Agent). Les deux services doivent lire
la même base MongoDB pour que les offres et les profils restent cohérents.

Les créations et modifications de profils candidats, offres et entreprises
placent une tâche BullMQ dans Redis. L'indexeur de SID_Agent recalcule ensuite
les index vectoriels candidats/offres dans Qdrant. Aucun vecteur n'est accepté
depuis le navigateur et les salons de l'emploi ne sont pas vectorisés.

Pour le développement local, démarrer Redis et les deux services :

```powershell
docker compose -f compose.redis.yml up -d --wait
npm run dev
npm run worker:matching
```

Configurer également `REDIS_URL=redis://127.0.0.1:6379`, `SID_AGENT_URL`,
`SID_SERVICE_API_KEY` et `SID_AGENT_SYNC_TIMEOUT_MS` dans l'environnement du
backend. Exécuter le worker dans un processus supervisé distinct. La réponse
des API de création/modification indique `indexing.status` (`queued` ou
`disabled`) ; un échec de mise en file retourne une erreur explicite et indique
que l'enregistrement métier a déjà été sauvegardé. Pour vérifier l'index,
utiliser `GET /api/ai/v1/matching/status` en tant qu'administrateur.

Le serveur écoute par défaut sur `http://localhost:5000` (ou sur le port défini
dans la configuration locale). La configuration locale doit contenir les
paramètres MongoDB, JWT et SMTP nécessaires. Ne partagez et ne commitez jamais
les secrets.

### Routes IA relayées par SID_Backend

Ces routes sont accessibles sous `/api/ai`. Pour toutes les routes avec rôle,
utiliser `Authorization: Bearer <accessToken>` obtenu via `/api/auth/login`.
SID_Backend valide le compte et le rôle avant de relayer la requête. N'envoyez
pas directement `X-Service-Key` ou `X-Platform-User-Id` depuis un client.

| Méthode | Route | Rôle | Usage |
|---|---|---|---|
| `POST` | `/api/ai/agent/parse-cv` | CANDIDATE | Envoie un PDF brut pour extraction; query `language=fr\|en`, `Idempotency-Key` requis. |
| `POST` | `/api/ai/agent/generate-pack` | CANDIDATE | Génère en arrière-plan un dossier personnalisé pour une offre SID. |
| `POST` | `/api/ai/agent/chat` | CANDIDATE, RECRUITER | Répond à un tour de conversation; requiert `Idempotency-Key`. |
| `POST` | `/api/ai/agent/source-candidates` | RECRUITER | Recherche jusqu'à cinq candidats avec `offer_id` ou `job_description`. |
| `POST` | `/api/ai/agent/score-application` | RECRUITER | Calcule la compatibilité d'un candidat avec une offre. |
| `POST` | `/api/ai/agent/evaluate-profile` | CANDIDATE | Évalue le profil accepté et donne des recommandations. |
| `POST` | `/api/ai/agent/candidate-refs/resolve` | RECRUITER | Résout un pseudonyme candidat rattaché à l'entreprise du recruteur. |
| `GET` | `/api/ai/agent/capabilities` | ADMIN | Retourne les capacités IA configurées. |
| `POST` | `/api/ai/v1/cv-imports` | CANDIDATE | Importe un PDF (octets bruts); `Idempotency-Key` requis. |
| `GET`, `PUT`, `DELETE` | `/api/ai/v1/cv-imports/:importId` | CANDIDATE | Lit, corrige ou supprime un import de CV. |
| `GET` | `/api/ai/v1/cv-imports/:importId/versions/:version` | CANDIDATE | Lit une version antérieure du CV. |
| `POST` | `/api/ai/v1/cv-imports/:importId/accept` | CANDIDATE | Accepte la version relue et crée un profil. |
| `POST` | `/api/ai/v1/profiles` | CANDIDATE | Crée un profil IA à partir de texte. |
| `GET`, `PUT` | `/api/ai/v1/profiles/:profileId` | CANDIDATE | Lit ou modifie un profil IA. |
| `GET` | `/api/ai/v1/profiles/:profileId/versions/:version` | CANDIDATE | Lit une version antérieure du profil. |
| `POST` | `/api/ai/v1/profiles/:profileId/accept` | CANDIDATE | Accepte une version du profil. |
| `GET` | `/api/ai/v1/profiles/:profileId/evaluation` | CANDIDATE | Calcule la complétude déterministe du profil. |
| `POST` | `/api/ai/v1/application-drafts/preview` | ADMIN | Génère un aperçu non persisté de lettre. |
| `POST` | `/api/ai/v1/application-drafts` | CANDIDATE | Met en file la génération d'une lettre; `Idempotency-Key` requis. |
| `POST` | `/api/ai/v1/application-dossiers` | CANDIDATE | Met en file la génération d'un dossier complet; `Idempotency-Key` requis. |
| `GET`, `PUT` | `/api/ai/v1/application-drafts/:draftId` | CANDIDATE | Lit ou modifie un brouillon. |
| `GET` | `/api/ai/v1/application-drafts/:draftId/versions/:version` | CANDIDATE | Lit une ancienne version du brouillon. |
| `PUT` | `/api/ai/v1/application-drafts/:draftId/evidence` | CANDIDATE | Corrige les preuves du dossier. |
| `POST` | `/api/ai/v1/application-drafts/:draftId/approvals` | CANDIDATE | Enregistre le consentement humain; n'envoie rien. |
| `GET` | `/api/ai/v1/tasks/:taskId` | CANDIDATE | Consulte l'état d'une génération asynchrone. |
| `POST` | `/api/ai/v1/conversations` | CANDIDATE, RECRUITER | Crée une conversation persistante. |
| `GET`, `DELETE` | `/api/ai/v1/conversations/:conversationId` | CANDIDATE, RECRUITER | Lit ou supprime une conversation appartenant à l'utilisateur. |
| `POST` | `/api/ai/v1/conversations/:conversationId/turns` | CANDIDATE, RECRUITER | Ajoute un tour; `Idempotency-Key` requis. |
| `POST` | `/api/ai/v1/knowledge/search` | ADMIN | Recherche dans la base de connaissances. |
| `GET` | `/api/ai/v1/knowledge/status` | ADMIN | État de l'index de connaissances. |
| `GET` | `/api/ai/v1/operations/status` | ADMIN | État des files et fournisseurs. |
| `GET` | `/api/ai/v1/matching/status` | ADMIN | État des index de matching. |
| `GET` | `/api/ai/v1/ai/status` | ADMIN | État des fournisseurs IA et quotas. |
| `GET` | `/api/ai/health` | Public | Liveness de SID_Agent. |
| `GET` | `/api/ai/health/ready` | Public | Readiness des dépendances configurées. |
| `GET` | `/api/ai/` | Public | Informations sur le service SID_Agent. |

Les corps attendus, paramètres, réponses détaillées et codes d'erreur sont
documentés dans la [référence API SID_Agent](../ai_api/SID_Agent/docs/api-reference.md).
La synchronisation immédiate des index est une route interne du service:
`POST /api/v1/matching/sync`; elle est déclenchée par le worker BullMQ et non par
le proxy public.

#### Exemple : créer une conversation puis envoyer un message

```bash
curl -X POST "http://localhost:5000/api/ai/v1/conversations" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d "{\"language\":\"fr\"}"
```

Utiliser ensuite le `id` de conversation retourné et sa `revision` courante:

```bash
curl -X POST "http://localhost:5000/api/ai/agent/chat" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: chat-unique-0001" \
  -d "{\"conversation_id\":\"<conversationId>\",\"expected_revision\":0,\"message\":\"Je cherche un stage PFE en développement web à Sfax\"}"
```

#### Exemple : envoyer un CV PDF

```bash
curl -X POST "http://localhost:5000/api/ai/agent/parse-cv?language=fr" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/pdf" \
  -H "Idempotency-Key: cv-unique-0001" \
  --data-binary "@cv.pdf"
```

Les générations asynchrones répondent avec un `task_id`, `poll_url` ou un en-tête
`Location`. Consulter `GET /api/ai/v1/tasks/:taskId` jusqu'à l'état final; relire
et corriger le résultat avant approbation. L'approbation IA ne soumet pas une
candidature.

## Utiliser l'API

Les exemples utilisent `http://localhost:5000` comme URL de base et `curl` pour les requêtes HTTP. Les corps sont au format JSON. Pour les routes protégées, ajoutez l'en-tête :

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Les paramètres `:id`, `:candidateId` et `:jobOfferId` sont des identifiants MongoDB renvoyés par l'API. Les routes d'écriture renvoient généralement l'objet créé ou modifié dans `data`, `user` ou `profile`. En cas d'erreur, la réponse contient un champ `message`; certaines routes utilisent aussi `success: false`.

## Vérification du serveur

### `GET /api/health`

Route publique, sans entrée.

Réponse `200` :

```json
{
  "status": "ok",
  "timestamp": "2026-01-01T12:00:00.000Z"
}
```

## Authentification — `/api/auth`

Les rôles utilisables à l'inscription sont `CANDIDATE` et `RECRUITER`. Les valeurs possibles pour le rôle sont `CANDIDATE`, `RECRUITER` et `ADMIN`; la création publique d'un administrateur est refusée.

### `POST /api/auth/register`

Entrée :

```json
{
  "email": "candidate@example.com",
  "password": "ExamplePassword123!",
  "role": "CANDIDATE"
}
```

Réponse `201` : `message` et `user` contenant `id`, `email` et `role`. Un code de confirmation est envoyé à l'adresse email.

### `POST /api/auth/verify-email`

Entrée :

```json
{
  "email": "candidate@example.com",
  "code": "123456"
}
```

Réponse `200` : `message` et `user` (`id`, `email`, `role`, `isEmailVerified`). Le code expire après 10 minutes.

### `POST /api/auth/resend-verification-code`

Entrée :

```json
{
  "email": "candidate@example.com"
}
```

Réponse `200` : message de confirmation; le code est renvoyé si le compte peut
être vérifié.

### `POST /api/auth/login`

Entrée :

```json
{
  "email": "candidate@example.com",
  "password": "ExamplePassword123!"
}
```

Réponse `200` : `message`, `user` (`id`, `email`, `role`, `isEmailVerified`), `accessToken` et `refreshToken`. Le compte doit être actif et l'adresse vérifiée.

### `POST /api/auth/refresh-token`

Entrée :

```json
{
  "refreshToken": "<refreshToken>"
}
```

Réponse `200` : `message` et nouvel `accessToken`.

### `POST /api/auth/logout`

Route protégée. Entrée : aucune, en dehors de l'en-tête Bearer.

Réponse `200` :

```json
{
  "message": "Déconnexion réussie"
}
```

Le refresh token enregistré pour le compte est invalidé.

### `POST /api/auth/forgot-password`

Entrée :

```json
{
  "email": "candidate@example.com"
}
```

Réponse `200` : message générique indiquant qu'un code a été envoyé. Pour éviter de révéler si un compte existe, la même réponse est renvoyée pour une adresse inconnue.

### `POST /api/auth/reset-password`

Entrée :

```json
{
  "email": "candidate@example.com",
  "code": "123456",
  "newPassword": "NewExamplePassword123!"
}
```

Réponse `200` : message de confirmation. Le code expire après 10 minutes et les sessions de renouvellement existantes sont invalidées.

### `POST /api/auth/change-password`

Route protégée.

Entrée :

```json
{
  "currentPassword": "ExamplePassword123!",
  "newPassword": "NewExamplePassword123!"
}
```

Réponse `200` : message de confirmation. Le refresh token existant est invalidé.

## Profils — `/api/v1/profiles`

Les routes `/company` sont réservées à `RECRUITER`. Les routes de profil candidat
sont réservées à `CANDIDATE`, sauf la liste consultable par `RECRUITER` et
`ADMIN`.

### `POST /api/v1/profiles/company`

Entrée :

```json
{
  "companyName": "TechSfax",
  "description": "Entreprise de développement logiciel",
  "industry": "Technologie",
  "address": "Sfax",
  "phone": "+216 70 000 000",
  "website": "https://example.com",
  "logo": "https://example.com/logo.png"
}
```

Réponse `201` : `{ "success": true, "message": "...", "profile": { ... } }`. `companyName` est requis; les autres champs sont facultatifs.

### `GET /api/v1/profiles/company/me`

Entrée : aucune.

Réponse `200` : `{ "success": true, "profile": { ... } }`.

### `PUT /api/v1/profiles/company/me`

Entrée : un ou plusieurs champs du profil parmi `companyName`, `description`, `industry`, `address`, `phone`, `website` et `logo`.

Réponse `200` : `{ "success": true, "message": "...", "profile": { ... } }`.

### `DELETE /api/v1/profiles/company/me`

Entrée : aucune.

Réponse `200` : `{ "success": true, "message": "Profil entreprise supprimé avec succès" }`.

### `GET /api/v1/profiles`

Réservée aux rôles `RECRUITER` et `ADMIN`. Paramètres facultatifs : `q`
(recherche de profils) et `city`.

Exemple : `GET /api/v1/profiles?q=Python&city=Sfax`.

### `GET /api/v1/profiles/candidate/me`

Réservée au candidat connecté. Retourne son profil candidat.

### `POST /api/v1/profiles/candidate/me`

Réservée au candidat. `fullName` est requis; `phone`, `city`, `parsedSkills`,
`parsedExperiences` et `parsedEducation` sont facultatifs.

```json
{
  "fullName": "Amira Ben Salah",
  "city": "Sfax",
  "parsedSkills": ["Python", "MongoDB"],
  "parsedExperiences": [],
  "parsedEducation": []
}
```

### `PUT /api/v1/profiles/candidate/me`

Réservée au candidat. Modifie les champs de son profil. Les champs `user`,
`rawCvUrl`, `cvEmbedding`, `completenessScore` et `isNewCandidate` sont en
lecture seule et ne peuvent pas être envoyés.

## Entreprises — `/api/companies`

### `GET /api/companies`

Route publique. Paramètres de requête facultatifs :

| Paramètre | Description |
|---|---|
| `industry` ou `sector` | Filtrer par secteur d'activité |
| `search` | Rechercher dans le nom, le secteur et la description |
| `verified` | Filtrer sur la vérification : `true` ou `false` |

Exemple : `GET /api/companies?search=tech&verified=true`

Réponse `200` : `{ "success": true, "count": 1, "data": [{ ... }] }`.

### `GET /api/companies/:id`

Route publique. Entrée : identifiant de l'entreprise dans l'URL.

Réponse `200` : `{ "success": true, "data": { ... } }`.

### `PUT /api/companies/:id`

Réservée au recruteur propriétaire. Entrée : champs modifiables du profil (`companyName`, `description`, `industry` ou `sector`, `address`, `phone`, `website`, `logo`).

Exemple :

```json
{
  "companyName": "TechSfax",
  "industry": "Technologie",
  "description": "Développement web et mobile"
}
```

Réponse `200` : `{ "success": true, "data": { ... } }`.

### `PATCH /api/companies/:id/verify`

Réservée au rôle `ADMIN`. Entrée : identifiant dans l'URL, aucun corps requis. Chaque appel inverse `isVerified`.

Réponse `200` : `{ "success": true, "data": { ... } }`.

## Offres d'emploi — `/api/jobs`

Les types d'offre sont `STAGE_PFE`, `STAGE_PERIODE` et `EMPLOI`. Les statuts sont `OPEN` et `CLOSED`.

### `GET /api/jobs`

Route publique. Les offres fermées ne sont pas incluses.

Paramètres facultatifs : `type` (type d'offre) et `search` (titre, description ou compétences requises).

Exemple : `GET /api/jobs?type=STAGE_PFE&search=Node.js`

Réponse `200` : `{ "success": true, "count": 1, "data": [{ ... }] }`.

### `GET /api/jobs/:id`

Route publique. Entrée : identifiant de l'offre dans l'URL.

Réponse `200` : `{ "success": true, "data": { ... } }`.

### `GET /api/jobs/mine`

Réservée au recruteur connecté. Retourne toutes ses offres, y compris celles qui
sont fermées.

### `POST /api/jobs`

Réservée au recruteur ayant un profil entreprise.

Entrée :

```json
{
  "title": "Développeur Node.js",
  "type": "EMPLOI",
  "description": "Développement et maintenance d'API",
  "requiredSkills": ["Node.js", "MongoDB"]
}
```

`title`, `type` et `description` sont requis; `requiredSkills` est un tableau de chaînes facultatif.

Réponse `201` : `{ "success": true, "data": { ... } }`. L'offre est créée avec le statut `OPEN`.

### `PUT /api/jobs/:id`

Réservée au recruteur propriétaire de l'offre. Entrée : un ou plusieurs champs parmi `title`, `type`, `description`, `requiredSkills`. La société et le statut ne sont pas modifiables ici.

Réponse `200` : `{ "success": true, "data": { ... } }`.

### `DELETE /api/jobs/:id`

Réservée au recruteur propriétaire. Entrée : identifiant dans l'URL.

Réponse `200` : `{ "success": true, "message": "Job offer deleted" }`.

### `PATCH /api/jobs/:id/close`

Réservée au recruteur propriétaire. Aucun corps requis.

Réponse `200` : `{ "success": true, "data": { ... "status": "CLOSED" } }`.

## Candidatures — `/api/v1/applications`

Les statuts sont `PENDING`, `REVIEWED`, `ACCEPTED` et `REJECTED`. Un candidat ne peut postuler qu'à une offre ouverte et une seule fois à une même offre.

### `POST /api/v1/applications`

Réservée au rôle `CANDIDATE`.

Entrée :

```json
{
  "jobOfferId": "<jobOfferId>",
  "customCvUrl": "https://example.com/cv.pdf",
  "motivationLetter": "Je souhaite rejoindre votre équipe."
}
```

`jobOfferId` (ou `jobOffer`) et `motivationLetter` sont requis; `customCvUrl` est
facultatif.

Réponse `201` : `{ "success": true, "data": { ... } }`. La candidature commence au statut `PENDING`.

### `GET /api/v1/applications/my-applications`

Réservée au candidat connecté. Paramètre facultatif `status` : `PENDING`,
`REVIEWED`, `ACCEPTED` ou `REJECTED`.

### `GET /api/v1/applications/candidate/:candidateId`

Réservée au candidat propriétaire du profil. Entrée : identifiant du profil candidat dans l'URL.

Réponse `200` : `{ "success": true, "count": 1, "data": [{ ... }] }`.

### `GET /api/v1/applications/job/:jobOfferId`

Réservée au recruteur propriétaire de l'offre. Entrée : identifiant de l'offre dans l'URL.

Réponse `200` : `{ "success": true, "count": 1, "data": [{ ... }] }`.

### `PATCH /api/v1/applications/:id/status`

Réservée au recruteur propriétaire de l'offre ou à `ADMIN`. Les statuts acceptés
sont `REVIEWED`, `ACCEPTED` et `REJECTED`.

Entrée :

```json
{
  "status": "ACCEPTED"
}
```

Réponse `200` : `{ "success": true, "data": { ... } }`.

### `PATCH /api/v1/applications/:id/validate`

Réservée au candidat propriétaire. Aucun corps requis. Seules les candidatures au statut `ACCEPTED` peuvent être validées.

Réponse `200` : `{ "success": true, "data": { ... "isValidatedByCandidate": true } }`.

## Actualités — `/api/news`

Les types média possibles sont `IMAGE`, `PDF` et `VIDEO`.

### `GET /api/news`

Route publique. Retourne les actualités publiées uniquement. Paramètres facultatifs : `companyId` et `search` (titre ou contenu).

Exemple : `GET /api/news?companyId=<companyId>&search=recrute`

Réponse `200` : `{ "success": true, "count": 1, "data": [{ ... }] }`.

### `GET /api/news/:id`

Route publique. Les articles non publiés ne sont pas accessibles. Entrée : identifiant de l'article dans l'URL.

Réponse `200` : `{ "success": true, "data": { ... } }`.

### `POST /api/news`

Réservée au recruteur ayant un profil entreprise.

Entrée :

```json
{
  "title": "Nous recrutons",
  "content": "Plusieurs postes sont ouverts.",
  "mediaUrl": "https://example.com/annonce.jpg",
  "mediaType": "IMAGE"
}
```

`title` et `content` sont requis; les informations média sont facultatives. L'article est créé non publié.

Réponse `201` : `{ "success": true, "data": { ... } }`.

### `PUT /api/news/:id`

Réservée au recruteur propriétaire de l'article. Entrée : un ou plusieurs champs parmi `title`, `content`, `mediaUrl`, `mediaType`.

Réponse `200` : `{ "success": true, "data": { ... } }`.

### `DELETE /api/news/:id`

Réservée au recruteur propriétaire. Entrée : identifiant dans l'URL.

Réponse `200` : `{ "success": true, "message": "News article deleted" }`.

### `PATCH /api/news/:id/publish`

Réservée au recruteur propriétaire. Aucun corps requis. Chaque appel inverse `isPublished`.

Réponse `200` : `{ "success": true, "data": { ... } }`.

## Utilisateurs — `/api/users`

### `GET /api/users`

Réservée à `ADMIN`. Entrée : aucune.

Réponse `200` : `{ "success": true, "users": [{ ... }] }`. Les mots de passe et refresh tokens ne sont pas inclus dans cette liste.

### `GET /api/users/me`

Réservée aux rôles `CANDIDATE` et `RECRUITER`. Entrée : aucune.

Réponse `200` : `{ "success": true, "user": { ... } }`.

### `PATCH /api/users/me`

Réservée aux rôles `CANDIDATE` et `RECRUITER`.

Entrée :

```json
{
  "email": "new-address@example.com"
}
```

Réponse `200` : `{ "success": true, "message": "Compte modifié avec succès", "user": { ... } }`. Une nouvelle vérification email est requise si l'adresse a changé.

### `DELETE /api/users/me`

Réservée aux rôles `CANDIDATE` et `RECRUITER`. Entrée : aucune.

Réponse `200` : `{ "success": true, "message": "Compte supprimé avec succès" }`.

### `GET /api/users/:id`

Réservée à `ADMIN`. Entrée : identifiant utilisateur dans l'URL.

Réponse `200` : `{ "success": true, "user": { ... } }`.

### `PUT /api/users/:id`

Réservée à `ADMIN`. Le service accepte `email` et `role`.

Entrée :

```json
{
  "email": "candidate@example.com",
  "role": "RECRUITER"
}
```

Réponse `200` : `{ "success": true, "message": "Utilisateur modifié avec succès", "user": { ... } }`.

### `DELETE /api/users/:id`

Réservée à `ADMIN`. Entrée : identifiant utilisateur dans l'URL.

Réponse `200` : `{ "success": true, "message": "Utilisateur supprimé avec succès" }`.

### `PATCH /api/users/:id/status`

Réservée à `ADMIN`.

Entrée :

```json
{
  "isActive": false
}
```

`isActive` doit être un booléen.

Réponse `200` : `{ "success": true, "message": "Utilisateur désactivé avec succès", "user": { ... } }` (ou message d'activation si `true`).

## Exemples avec curl

Lire les offres ouvertes :

```bash
curl "http://localhost:5000/api/jobs?search=Node.js"
```

Créer une offre (remplacer `<accessToken>` par le token obtenu au login) :

```bash
curl -X POST "http://localhost:5000/api/jobs" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Développeur Node.js\",\"type\":\"EMPLOI\",\"description\":\"Développement d'API\",\"requiredSkills\":[\"Node.js\"]}"
```

## Codes de réponse courants

- `200` : requête réussie.
- `201` : ressource créée.
- `400` : corps invalide, validation échouée ou erreur métier.
- `401` : authentification absente, invalide ou expirée.
- `403` : rôle insuffisant ou compte désactivé.
- `404` : ressource introuvable.
- `409` : conflit, par exemple candidature déjà déposée ou validation d'une candidature non acceptée.
- `500` : erreur serveur.

## Contribuer

```bash
git checkout -b feature/votre-nom
git add .
git commit -m "description de la modification"
git push origin feature/votre-nom
```
