import { PricingBillingType, PricingDiscountType, PricingPriceType } from "@prisma/client";

export const defaultPricingIntro = "VisiPro accompagne les entreprises dans le développement de leur présence en ligne à travers des solutions adaptées à leurs besoins : sites internet, référencement local, Google Business, supports digitaux et accompagnement web.";

export const defaultPricingTerms = `Informations tarifaires\n\nLes tarifs présentés sont indicatifs et peuvent varier selon les besoins spécifiques du projet.\n\nUn devis personnalisé est établi avant toute prestation.\n\nLes éventuels frais externes tels que l'hébergement, les noms de domaine, les licences ou services tiers peuvent être facturés séparément lorsqu'ils ne sont pas explicitement inclus dans l'offre.\n\nLes prestations et tarifs peuvent évoluer.`;

export const detailedPricingTerms = `Informations tarifaires\n\nLes tarifs indiqués correspondent aux prestations décrites et peuvent évoluer lorsque le périmètre du projet diffère des éléments prévus.\n\nUn devis personnalisé précisant les prestations, le tarif et les conditions applicables est établi avant le démarrage du projet.\n\nDélais\n\nLes délais indiqués sont estimatifs et débutent lorsque VisiPro dispose des informations, contenus et accès nécessaires à la réalisation de la prestation.\n\nLes délais dépendant de plateformes ou services tiers ne peuvent pas être garantis.\n\nModifications\n\nLes corrections comprises sont précisées dans l'offre correspondante.\n\nToute évolution importante du périmètre initial peut faire l'objet d'une facturation complémentaire après accord du client.\n\nServices externes\n\nSauf indication contraire, les frais liés aux services tiers ne sont pas compris : hébergement, nom de domaine, licences, services SaaS, abonnements externes, frais d'impression, publicité.`;

export const defaultEstimatedTimeDisclaimer = "Les temps de travail indiqués sont des estimations et peuvent varier selon la complexité du projet, les demandes spécifiques et les éléments fournis par le client.";

export const defaultDeliveryTimeDisclaimer = "Les délais de réalisation sont indicatifs et commencent à compter de la réception des éléments nécessaires au projet. Ils peuvent évoluer en fonction des délais de réponse du client et des éventuels services tiers.";

export function parseFeatures(value: FormDataEntryValue | null) {
  return String(value || "").split("\n").map((line) => line.trim()).filter(Boolean);
}

export const parseList = parseFeatures;

export function applyDiscount(price: number, discountType: PricingDiscountType, discountValue: number) {
  if (discountType === PricingDiscountType.AMOUNT) return Math.max(0, price - discountValue);
  if (discountType === PricingDiscountType.PERCENT) return Math.max(0, price * (1 - discountValue / 100));
  return price;
}

export function formatPricingAmount(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
}

export function formatPricingPrice(input: { basePrice: number; minPrice?: number | null; maxPrice?: number | null; customPriceText?: string | null; priceType: PricingPriceType; billingType: PricingBillingType; currency: string; showPrice: boolean }) {
  if (!input.showPrice) return "Prix masqué";
  const suffix = input.billingType === PricingBillingType.MONTHLY ? " / mois" : input.billingType === PricingBillingType.YEARLY ? " / an" : "";
  if (input.priceType === PricingPriceType.ON_QUOTE) return "Sur devis";
  if (input.priceType === PricingPriceType.CUSTOM_TEXT) return input.customPriceText || "Tarif personnalisé";
  if (input.priceType === PricingPriceType.FROM_TO) return `${formatPricingAmount(input.minPrice ?? input.basePrice, input.currency)} - ${formatPricingAmount(input.maxPrice ?? input.basePrice, input.currency)}${suffix}`;
  if (input.priceType === PricingPriceType.FIXED) return `${formatPricingAmount(input.basePrice, input.currency)}${suffix}`;
  return `À partir de ${formatPricingAmount(input.basePrice, input.currency)}${suffix}`;
}

export function formatHoursRange(min?: number | null, max?: number | null) {
  if (min && max) return min === max ? `${min} h` : `${min} à ${max} h`;
  if (min) return `à partir de ${min} h`;
  if (max) return `jusqu'à ${max} h`;
  return null;
}

export function formatDeliveryRange(min?: number | null, max?: number | null) {
  if (min && max) return min === max ? `${min} jour ouvré` : `${min} à ${max} jours ouvrés`;
  if (min) return `à partir de ${min} jours ouvrés`;
  if (max) return `jusqu'à ${max} jours ouvrés`;
  return null;
}

export function calculateHourlyRange(price: number, cost: number, min?: number | null, max?: number | null) {
  const margin = price - cost;
  if (!min || !max || min <= 0 || max <= 0) return null;
  return { low: margin / max, high: margin / min, margin };
}

export type PricingBackfill = {
  shortDescription?: string;
  longDescription?: string;
  estimatedHoursMin?: number;
  estimatedHoursMax?: number;
  estimatedDeliveryDaysMin?: number;
  estimatedDeliveryDaysMax?: number;
  revisionsIncluded?: number | null;
  revisionPolicy?: string;
  deliverables?: string[];
  clientRequirements?: string[];
  notIncluded?: string[];
};

const siteRequirements = ["logo si disponible", "textes ou informations sur l'entreprise", "coordonnées", "prestations", "photos si disponibles", "accès nécessaires au domaine/hébergement lorsque pertinent"];
const siteNotIncluded = ["rédaction importante de contenus", "shooting photo", "fonctionnalités complexes", "abonnement d'hébergement", "achat du nom de domaine", "services externes payants"];
const revisionPolicy = "Les corrections concernent les éléments prévus dans la prestation initiale. Toute demande importante modifiant le périmètre du projet peut faire l'objet d'un devis complémentaire.";

export const pricingBackfillByName: Record<string, PricingBackfill> = {
  "Site vitrine Essentiel": { estimatedHoursMin: 6, estimatedHoursMax: 10, estimatedDeliveryDaysMin: 3, estimatedDeliveryDaysMax: 7, revisionsIncluded: 2, revisionPolicy, shortDescription: "Site vitrine professionnel destiné aux petites entreprises souhaitant disposer rapidement d'une présence en ligne moderne, claire et adaptée aux mobiles.", longDescription: "Création d'un site vitrine professionnel permettant de présenter l'entreprise, ses services et ses coordonnées. Le site est conçu pour offrir une navigation simple sur ordinateur, tablette et smartphone, tout en mettant en avant les principales actions attendues du visiteur.", deliverables: ["jusqu'à 5 pages", "design professionnel", "responsive desktop / tablette / mobile", "formulaire de contact", "Google Maps", "liens réseaux sociaux", "SEO technique et on-page de base", "configuration technique", "mise en ligne", "tests avant livraison"], clientRequirements: siteRequirements, notIncluded: siteNotIncluded },
  "Site vitrine Pro": { estimatedHoursMin: 10, estimatedHoursMax: 16, estimatedDeliveryDaysMin: 5, estimatedDeliveryDaysMax: 10, revisionsIncluded: 3, revisionPolicy, shortDescription: "Site vitrine plus complet destiné aux entreprises souhaitant une présence en ligne plus poussée, davantage de contenu et une image de marque plus travaillée.", longDescription: "Conception d'un site professionnel personnalisé allant au-delà d'une simple présence en ligne. Cette formule convient aux entreprises souhaitant présenter plusieurs services, intégrer davantage de contenus, renforcer leur crédibilité et disposer d'une base plus solide pour leur référencement.", deliverables: ["jusqu'à 8 pages", "design personnalisé", "responsive complet", "formulaire avancé", "galerie", "avis clients", "Google Maps", "optimisation SEO", "optimisation des performances", "Analytics", "configuration technique", "mise en ligne", "tests fonctionnels et responsive"], clientRequirements: siteRequirements, notIncluded: ["fonctionnalités métier complexes", "e-commerce complet", "licences payantes", "création importante de contenu", "shooting photo sauf prestation complémentaire"] },
  "Site Premium / Sur mesure": { estimatedHoursMin: 16, estimatedHoursMax: 30, estimatedDeliveryDaysMin: 7, estimatedDeliveryDaysMax: 20, revisionsIncluded: null, revisionPolicy: "Révisions définies selon le projet.", shortDescription: "Solution destinée aux projets nécessitant une conception poussée, une identité visuelle plus avancée ou des fonctionnalités spécifiques.", longDescription: "Le temps, le délai et le prix final peuvent dépasser ces estimations selon la complexité et sont déterminés après analyse du cahier des charges.", deliverables: ["architecture personnalisée", "design avancé", "pages supplémentaires", "animations légères", "fonctionnalités spécifiques", "intégrations externes", "SEO renforcé", "optimisation des performances", "accompagnement au lancement"], clientRequirements: siteRequirements, notIncluded: ["prestations non prévues au cahier des charges", "services tiers payants", "licences", "hébergement", "nom de domaine"] },
  "Site restaurant": { estimatedHoursMin: 8, estimatedHoursMax: 14, estimatedDeliveryDaysMin: 4, estimatedDeliveryDaysMax: 8, revisionsIncluded: 2, revisionPolicy, shortDescription: "Création d'un site adapté aux restaurants permettant aux clients de consulter rapidement la carte, les horaires, l'adresse, les photos et les possibilités de réservation.", deliverables: ["présentation du restaurant", "carte/menu", "horaires", "galerie", "coordonnées", "Google Maps", "téléphone cliquable", "réseaux sociaux", "réservation ou redirection vers une plateforme", "responsive", "SEO local de base"], clientRequirements: ["logo", "carte/menu", "horaires", "coordonnées", "photos", "liens de réservation si existants"], notIncluded: ["shooting photo", "impression de menus", "abonnements de plateformes de réservation"] },
  "Création / mise en page d'une carte ou menu": { estimatedHoursMin: 1, estimatedHoursMax: 3, estimatedDeliveryDaysMin: 1, estimatedDeliveryDaysMax: 3, revisionsIncluded: 2, revisionPolicy, shortDescription: "Création ou remise en forme professionnelle d'une carte de restaurant destinée à une utilisation numérique ou à l'impression.", deliverables: ["hiérarchisation des catégories", "mise en page", "intégration logo", "identité visuelle", "export PDF haute qualité", "version numérique"], clientRequirements: ["liste des plats", "prix", "allergènes si nécessaires", "logo", "charte ou exemples souhaités"], notIncluded: ["impression physique sauf devis spécifique", "photos produits"] },
  "Création / optimisation complète d'une fiche Google": { estimatedHoursMin: 2, estimatedHoursMax: 4, estimatedDeliveryDaysMin: 2, estimatedDeliveryDaysMax: 5, shortDescription: "Création, configuration ou optimisation complète d'une fiche Google Business Profile afin d'améliorer sa présentation et sa visibilité locale.", deliverables: ["audit initial", "catégories", "description", "services", "coordonnées", "horaires", "liens", "recommandations photos", "optimisation SEO locale", "recommandations concernant les avis"], clientRequirements: ["accès ou validation Google", "coordonnées", "horaires", "services", "photos"], notIncluded: ["position Google garantie", "validation Google garantie dans un délai fixe"] },
  "Optimisation d'une fiche existante": { estimatedHoursMin: 1.5, estimatedHoursMax: 3, estimatedDeliveryDaysMin: 1, estimatedDeliveryDaysMax: 3, shortDescription: "Audit et optimisation d'une fiche Google Business existante pour améliorer la qualité, la cohérence et la pertinence des informations publiées.", deliverables: ["audit", "correction des informations", "catégories", "description", "services", "recommandations", "optimisation générale"] },
  "Audit SEO local": { estimatedHoursMin: 2, estimatedHoursMax: 4, estimatedDeliveryDaysMin: 2, estimatedDeliveryDaysMax: 4, shortDescription: "Analyse du référencement actuel d'un site et identification des principaux axes d'amélioration pour sa visibilité locale.", deliverables: ["analyse du site", "SEO local", "structure", "titres", "meta descriptions", "référencement géographique", "problèmes principaux", "recommandations classées par priorité"] },
  "Optimisation SEO d'un site": { estimatedHoursMin: 4, estimatedHoursMax: 8, estimatedDeliveryDaysMin: 3, estimatedDeliveryDaysMax: 7, shortDescription: "Optimisation du contenu et de la structure d'un site existant afin d'améliorer sa compréhension par les moteurs de recherche.", longDescription: "Le temps et le prix dépendent fortement du nombre de pages et de l'état initial du site. Aucune position Google précise ne peut être garantie.", deliverables: ["optimisation des titres", "meta descriptions", "structure Hn", "contenus", "liens internes", "optimisation locale", "recommandations techniques"], notIncluded: ["garantie de position Google", "création importante de contenu non prévue"] },
  "Shooting photo professionnel entreprise / commerce": { estimatedHoursMin: 2, estimatedHoursMax: 4, estimatedDeliveryDaysMin: 2, estimatedDeliveryDaysMax: 5, shortDescription: "Shooting destiné à produire des photographies professionnelles utilisables sur un site internet, Google Business Profile et les réseaux sociaux.", longDescription: "Temps indicatif : préparation 30 min, shooting 1 à 2 heures, tri et retouche 1 à 2 heures. Le nombre de photos finales doit être configuré selon la prestation.", deliverables: ["établissement", "équipe", "produits", "ambiance", "photos web", "photos Google", "photos réseaux sociaux"] },
  "Maintenance Essentiel": { estimatedHoursMin: 0, estimatedHoursMax: 0.5, revisionsIncluded: null, shortDescription: "Maintenance technique essentielle destinée à conserver un site fonctionnel et à intervenir sur les problèmes mineurs.", deliverables: ["surveillance", "mises à jour", "sauvegardes", "corrections mineures", "support email"], notIncluded: ["nouvelles fonctionnalités", "modifications importantes facturées séparément"] },
  "Maintenance Pro": { estimatedHoursMin: 0, estimatedHoursMax: 1, revisionsIncluded: null, shortDescription: "Maintenance technique accompagnée de petites modifications régulières du contenu.", deliverables: ["tout Essentiel", "petites modifications", "vérification des performances", "assistance prioritaire"] },
  "Webmaster Premium": { estimatedHoursMin: 0, estimatedHoursMax: 2, revisionsIncluded: null, shortDescription: "Accompagnement plus complet permettant de faire évoluer régulièrement le contenu et certains éléments du site.", longDescription: "Le nombre d'heures inclus et le report éventuel des heures non utilisées doivent être configurés selon l'offre.", deliverables: ["maintenance", "modifications régulières", "ajout de contenu", "suivi", "assistance prioritaire", "petites évolutions"] },
  "Pack Présence Locale": { estimatedHoursMin: 8, estimatedHoursMax: 12, estimatedDeliveryDaysMin: 4, estimatedDeliveryDaysMax: 8, shortDescription: "Solution complète pour une petite entreprise souhaitant développer rapidement une présence locale professionnelle.", deliverables: ["site vitrine Essentiel", "optimisation Google Business", "SEO local de base"] },
  "Pack Business": { estimatedHoursMin: 12, estimatedHoursMax: 18, estimatedDeliveryDaysMin: 5, estimatedDeliveryDaysMax: 12, shortDescription: "Solution complète pour les entreprises souhaitant disposer d'un site professionnel et d'une présence digitale locale plus développée.", deliverables: ["site Pro", "Google Business", "SEO", "Analytics", "accompagnement au lancement"] },
  "Pack Restaurant": { estimatedHoursMin: 11, estimatedHoursMax: 17, estimatedDeliveryDaysMin: 5, estimatedDeliveryDaysMax: 10, shortDescription: "Solution digitale complète pensée pour un restaurant souhaitant améliorer sa visibilité et simplifier l'accès aux informations essentielles pour ses clients.", deliverables: ["site restaurant", "carte/menu", "Google Business", "SEO local", "intégration réservation"] }
};

export const optionHourEstimates: Record<string, [number, number] | null> = {
  "Page supplémentaire": [0.5, 1.5], "Galerie avancée": [1, 2], "Ajout d'un blog": [1.5, 3], "Formulaire avancé": [1, 2], "Prise de rendez-vous": [1.5, 3], "Intégration système de réservation": [1, 2], "Multilingue": [2, 5], "Migration d'un ancien site": [2, 6], "Configuration Google Analytics": [0.5, 1], "Optimisation Google Business avec le site": [1.5, 3], "SEO avancé": null, "Fonctionnalité spécifique": null
};

export const defaultPricingCatalog = [
  { name: "Sites internet", items: [
    { name: "Site vitrine Essentiel", price: 590, features: ["site professionnel jusqu'à 5 pages", "design responsive ordinateur / tablette / mobile", "formulaire de contact", "intégration Google Maps", "liens vers les réseaux sociaux", "optimisation SEO de base", "configuration technique", "mise en ligne"], short: "Pour petites entreprises souhaitant une présence professionnelle simple sur internet." },
    { name: "Site vitrine Pro", price: 890, features: ["jusqu'à 8 pages", "design personnalisé", "responsive complet", "formulaire avancé", "galerie", "avis clients", "intégration Google Maps", "optimisation SEO", "optimisation des performances", "Google Analytics ou solution équivalente", "configuration technique", "mise en ligne"] },
    { name: "Site Premium / Sur mesure", price: 1290, features: ["architecture personnalisée", "design avancé", "pages supplémentaires selon projet", "animations légères", "fonctionnalités spécifiques", "SEO renforcé", "performances optimisées", "intégrations externes", "accompagnement à la mise en ligne"], short: "Tarif défini précisément après analyse du projet." }
  ] },
  { name: "Restaurants", items: [
    { name: "Site restaurant", price: 790, features: ["présentation du restaurant", "menu / carte", "horaires", "galerie photos", "coordonnées", "Google Maps", "téléphone cliquable", "liens réseaux sociaux", "réservation ou lien vers plateforme externe", "version mobile optimisée", "SEO local de base"] },
    { name: "Création / mise en page d'une carte ou menu", price: 100, features: ["mise en page professionnelle", "organisation des catégories", "intégration logo et identité visuelle", "fichier numérique prêt à utiliser"], short: "Les impressions éventuelles ne sont pas comprises sauf mention contraire." }
  ] },
  { name: "Google Business Profile", items: [
    { name: "Création / optimisation complète d'une fiche Google", price: 200, features: ["création ou reprise de la fiche", "catégories", "description optimisée", "services", "coordonnées", "horaires", "liens", "optimisation des informations", "recommandations photos", "optimisation SEO local", "conseils pour obtenir davantage d'avis"] },
    { name: "Optimisation d'une fiche existante", price: 120, features: ["audit", "correction des informations", "catégories", "description", "services", "recommandations", "optimisation générale"] }
  ] },
  { name: "SEO / Référencement", items: [
    { name: "Audit SEO local", price: 150, features: ["analyse du site", "analyse SEO local", "structure des pages", "titres", "meta descriptions", "référencement géographique", "recommandations prioritaires"] },
    { name: "Optimisation SEO d'un site", price: 250, features: ["optimisation des titres", "meta descriptions", "structure Hn", "contenus", "liens internes", "optimisation locale", "recommandations techniques"], short: "Le prix dépend du nombre de pages et de l'état initial du site." }
  ] },
  { name: "Photos", items: [{ name: "Shooting photo professionnel entreprise / commerce", price: 200, features: ["photos de l'établissement", "produits", "équipe", "ambiance", "photos destinées au site internet", "photos pour Google Business", "photos pour réseaux sociaux"], short: "Le nombre exact de photos et la durée doivent pouvoir être définis dans la fiche prestation." }] },
  { name: "Maintenance / Webmaster", items: [
    { name: "Maintenance Essentiel", price: 29, billing: PricingBillingType.MONTHLY, type: PricingPriceType.FIXED, features: ["surveillance du site", "mises à jour techniques", "sauvegardes", "corrections mineures", "assistance email"] },
    { name: "Maintenance Pro", price: 49, billing: PricingBillingType.MONTHLY, type: PricingPriceType.FIXED, features: ["tout Essentiel", "petites modifications de contenu", "mises à jour régulières", "vérification des performances", "assistance prioritaire"] },
    { name: "Webmaster Premium", price: 89, billing: PricingBillingType.MONTHLY, type: PricingPriceType.FIXED, features: ["maintenance complète", "modifications régulières", "ajout de contenus", "suivi du site", "assistance prioritaire", "petites évolutions"], short: "Limite de modifications incluse configurable." }
  ] },
  { name: "Options", items: [
    { name: "Page supplémentaire", price: 60, type: PricingPriceType.FIXED }, { name: "Galerie avancée", price: 80, type: PricingPriceType.FIXED }, { name: "Ajout d'un blog", price: 120, type: PricingPriceType.FIXED }, { name: "Formulaire avancé", price: 80, type: PricingPriceType.FIXED }, { name: "Prise de rendez-vous", price: 120, type: PricingPriceType.FIXED }, { name: "Intégration système de réservation", price: 100, type: PricingPriceType.FIXED }, { name: "Multilingue", price: 150 }, { name: "Migration d'un ancien site", price: 150 }, { name: "Configuration Google Analytics", price: 60, type: PricingPriceType.FIXED }, { name: "Optimisation Google Business avec le site", price: 150, type: PricingPriceType.FIXED }, { name: "SEO avancé", price: 0, type: PricingPriceType.ON_QUOTE }, { name: "Fonctionnalité spécifique", price: 0, type: PricingPriceType.ON_QUOTE }
  ] },
  { name: "Packs", items: [
    { name: "Pack Présence Locale", price: 690, isPack: true, showSavings: true, features: ["site vitrine Essentiel", "optimisation Google Business", "SEO local de base"] },
    { name: "Pack Business", price: 990, isPack: true, showSavings: true, features: ["site vitrine Pro", "Google Business", "SEO", "Analytics", "accompagnement au lancement"] },
    { name: "Pack Restaurant", price: 990, isPack: true, showSavings: true, features: ["site restaurant", "carte / menu", "optimisation Google Business", "SEO local", "intégration réservation"] }
  ] }
] as const;
