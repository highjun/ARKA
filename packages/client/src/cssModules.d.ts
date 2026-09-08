// CSS Modules를 import하면 클래스 이름 맵이 온다. arka-ui 컴포넌트들이 이
// 방식을 쓰므로 B단계 전에 미리 둔다.
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

// globals.css·reset.css처럼 부수효과로만 넣는 스타일시트.
declare module "*.css";
