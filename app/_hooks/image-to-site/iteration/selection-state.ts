export class SelectionCollection {
  protected readonly ids: string[];

  constructor(ids: string[] = []) {
    this.ids = SelectionCollection.normalize(ids);
  }

  static normalize(ids: string[] = []) {
    const seen = new Set<string>();
    const normalized: string[] = [];
    ids.forEach((id) => {
      if (!id || seen.has(id)) {
        return;
      }
      seen.add(id);
      normalized.push(id);
    });
    return normalized;
  }

  get values() {
    return [...this.ids];
  }

  contains(id: string) {
    return this.ids.includes(id);
  }

  get isEmpty() {
    return this.ids.length === 0;
  }
}

export class ActiveSelection extends SelectionCollection {
  static empty() {
    return new ActiveSelection();
  }

  static ensurePrimary(ids: string[], primary: string | null | undefined) {
    if (!primary) {
      return ids;
    }
    const index = ids.indexOf(primary);
    if (index === -1) {
      return [primary, ...ids];
    }
    if (index === 0) {
      return ids;
    }
    const next = [...ids];
    next.splice(index, 1);
    next.unshift(primary);
    return next;
  }

  get selectedIds() {
    return this.values;
  }

  get primaryId() {
    return this.selectedIds[0] ?? null;
  }

  update(ids: string[], primary?: string | null) {
    const normalized = SelectionCollection.normalize(ids);
    const reordered = ActiveSelection.ensurePrimary(
      normalized,
      primary ?? normalized[0] ?? null
    );
    return new ActiveSelection(reordered);
  }

  withPrimary(id: string | null | undefined) {
    if (!id) {
      return ActiveSelection.empty();
    }
    if (this.contains(id)) {
      const reordered = ActiveSelection.ensurePrimary(this.ids, id);
      return new ActiveSelection(reordered);
    }
    return new ActiveSelection([id, ...this.ids]);
  }

  toggle(id: string) {
    if (!id) {
      return this;
    }
    if (this.contains(id)) {
      return new ActiveSelection(this.ids.filter((entry) => entry !== id));
    }
    return new ActiveSelection([...this.ids, id]);
  }

  clear() {
    return ActiveSelection.empty();
  }
}
