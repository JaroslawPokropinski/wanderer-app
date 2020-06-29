export const delay = (time = 0) =>
  new Promise<void>((resolve) => {
    setTimeout(() => resolve(), time);
  });
