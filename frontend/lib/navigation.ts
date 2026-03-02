import { Brand, Category } from "@/lib/types";

export type CategoryTreeNode = {
  category: Category;
  children: CategoryTreeNode[];
};

export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const byId = new Map<string, CategoryTreeNode>();
  categories.forEach((category) => {
    byId.set(category.id, { category, children: [] });
  });

  const roots: CategoryTreeNode[] = [];
  categories.forEach((category) => {
    const node = byId.get(category.id);
    if (!node) {
      return;
    }
    if (category.parent) {
      const parentNode = byId.get(category.parent);
      if (parentNode) {
        parentNode.children.push(node);
        return;
      }
    }
    roots.push(node);
  });

  const sortNodes = (nodes: CategoryTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.category.sort_order === b.category.sort_order) {
        return a.category.name.localeCompare(b.category.name);
      }
      return a.category.sort_order - b.category.sort_order;
    });
    nodes.forEach((node) => sortNodes(node.children));
  };

  sortNodes(roots);
  return roots;
}

export function getTopCategories(categories: Category[], max = 8): Category[] {
  return [...categories]
    .filter((category) => !category.parent)
    .sort((a, b) => {
      if (a.sort_order === b.sort_order) {
        return a.name.localeCompare(b.name);
      }
      return a.sort_order - b.sort_order;
    })
    .slice(0, max);
}

export function getTopBrands(brands: Brand[], max = 10): Brand[] {
  return [...brands]
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, max);
}
