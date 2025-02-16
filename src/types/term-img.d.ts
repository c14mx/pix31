declare module "term-img" {
  interface TermImgOptions {
    width?: string;
    height?: string;
    fallback?: string | (() => string);
  }

  function termImg(image: string, options?: TermImgOptions): string;
  export default termImg;
}
