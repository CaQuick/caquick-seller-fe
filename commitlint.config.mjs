export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 한국어 제목·본문을 그대로 쓰기 위해 대소문자·줄 길이·footer 규칙을 끈다(BE와 동일)
    'subject-case': [0],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
    'footer-leading-blank': [0],
  },
};
