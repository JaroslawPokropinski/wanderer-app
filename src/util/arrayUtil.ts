export function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

export function iterate<T>(list: Array<T>) {
  let offset = 0;
  return function () {
    if (offset === list.length) return null;

    const len = list.length - offset;
    const i = (Math.random() * len) | 0;
    const el = list[offset + i];

    const tmp = list[offset];
    list[offset] = el;
    list[offset + i] = tmp;
    offset++;

    return el;
  };
}
