import heroNexoraVault from '../assets/images/hero_nexora_vault_1794724171195.jpg';
import prodEbookSystems from '../assets/images/prod_ebook_systems_1794724171822.jpg';
import prodTemplateKit from '../assets/images/prod_template_kit_1794724173326.jpg';
import prodCourseMastery from '../assets/images/prod_course_mastery_1794724173400.jpg';
import prodGuideSecurity from '../assets/images/prod_guide_security_1794724172649.jpg';
import prodBundleResources from '../assets/images/prod_bundle_resources_1794724172556.jpg';

export const ASSET_IMAGES: Record<string, string> = {
  'asset:hero_nexora_vault': heroNexoraVault,
  'asset:prod_ebook_systems': prodEbookSystems,
  'asset:prod_template_kit': prodTemplateKit,
  'asset:prod_course_mastery': prodCourseMastery,
  'asset:prod_guide_security': prodGuideSecurity,
  'asset:prod_bundle_resources': prodBundleResources,
};

export const PRESET_IMAGE_OPTIONS = [
  { key: 'asset:prod_ebook_systems', label: 'Hardcover Architectural Book' },
  { key: 'asset:prod_template_kit', label: 'Isometric Glass UI Plates' },
  { key: 'asset:prod_course_mastery', label: 'Studio Workstation Display' },
  { key: 'asset:prod_guide_security', label: 'Obsidian Prism & Hardware Key' },
  { key: 'asset:prod_bundle_resources', label: 'Stacked Slate Folio Vault' },
  { key: 'asset:hero_nexora_vault', label: 'Obsidian Tablet & Glass Showcase' },
];

export function resolveImageSrc(imageUrl: string | undefined | null): string {
  if (!imageUrl) return prodEbookSystems;
  if (ASSET_IMAGES[imageUrl]) {
    return ASSET_IMAGES[imageUrl];
  }
  return imageUrl;
}
