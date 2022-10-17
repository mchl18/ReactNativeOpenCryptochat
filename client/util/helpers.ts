export const sliceIntoChunks = (arr: string, chunkSize: number) => {
  const res = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    res.push(chunk);
  }
  return res;
};

export const getKeySnippet = (key: string) => {
  return key.slice(400, 416);
};
