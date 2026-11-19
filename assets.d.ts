// Metro가 에셋 id(number)로 바꾸는 글꼴 파일
declare module '*.otf' {
  const asset: number;
  export default asset;
}
