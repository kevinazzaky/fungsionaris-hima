import type { PublicContentRepository } from "../domain/repositories";

export async function getPublicContent(repository: PublicContentRepository) {
  const [members, gallery] = await Promise.all([
    repository.members(),
    repository.gallery(),
  ]);
  return { members, gallery };
}
