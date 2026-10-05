// Metro가 이미지 import를 asset id(number)로 바꾼다. 다른 이미지 선언과 겹치지 않게 이 파일만 짚는다
declare module '*/caquick-logo.png' {
  const asset: number;
  export default asset;
}
