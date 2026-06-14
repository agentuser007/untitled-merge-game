export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

interface HasId {
    id: string;
    [key: string]: unknown;
}

function hasId(obj: unknown): obj is HasId {
    return obj !== null && typeof obj === 'object' && 'id' in obj;
}

export function deepMerge<T extends object>(base: T, overlay: DeepPartial<T>): T {
    if (overlay === null || overlay === undefined) return base;
    if (typeof overlay !== 'object') return overlay as T;
    if (typeof base !== 'object' || base === null) return overlay as T;

    if (Array.isArray(base) && Array.isArray(overlay)) {
        if (base.length > 0 && overlay.length > 0 &&
            hasId(base[0]) && hasId(overlay[0])) {
            const overlayById: Record<string, unknown> = {};
            for (const item of overlay) {
                if (hasId(item)) {
                    overlayById[item.id] = item;
                }
            }
            const result = base.map((baseEl) => {
                if (hasId(baseEl) && baseEl.id in overlayById) {
                    return deepMerge(baseEl, overlayById[baseEl.id] as DeepPartial<typeof baseEl>);
                }
                return baseEl;
            });
            const baseIds = new Set(
                base.filter((el): el is HasId => hasId(el)).map(el => el.id)
            );
            for (const item of overlay) {
                if (hasId(item) && !baseIds.has(item.id)) {
                    result.push(item);
                }
            }
            return result as T;
        }
        return base.map((item, i: number) => {
            return i < overlay.length ? deepMerge(item, overlay[i] as DeepPartial<typeof item>) : item;
        }) as T;
    }

    const result = Object.assign({}, base) as Record<string, unknown>;
    const overlayRec = overlay as Record<string, unknown>;
    const keys = Object.keys(overlayRec);
    for (const key of keys) {
        if (key in result) {
            result[key] = deepMerge(result[key] as object, overlayRec[key] as DeepPartial<object>);
        } else {
            result[key] = overlayRec[key];
        }
    }
    return result as T;
}
