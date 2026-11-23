/* Interactive Gallery에 로봇핸드 제품 사진 말고 다른 사진을 더 넣는 곳입니다.
   연구 프로젝트·실험·연구실 활동 사진을 assets/img/gallery/ 에 넣고 아래 목록에 한 줄씩 추가하세요.
   항목이 하나라도 있으면 갤러리 위에 분류 버튼(전체 · 로봇핸드 · 연구 · 실험 · 연구실)이 나타납니다.

   type : "research" | "experiment" | "lab"
   src  : 사진 경로 (가로·세로 1200px 이하 webp/jpg 권장)
   w, h : 사진 원본 크기(px) — 화면이 흔들리지 않게 미리 자리를 잡는 데 씁니다
   title: 크게 보기에서 보이는 제목
   text : 짧은 설명(선택)
   date : "2026.09" 같은 날짜(선택)
   link : 더 읽을 주소(선택)

   예)
   { type: "research", src: "assets/img/gallery/flexure-hand.webp", w: 1200, h: 900,
     title: "Flexure 기반 인간형 로봇핸드", text: "충격과 하중에 강한 유연 관절 손가락", date: "2026.03",
     link: "https://sites.google.com/view/handslab/research-areas" },
*/
window.HANDSLAB_GALLERY_EXTRA = [
];
