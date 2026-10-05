import { z } from 'zod';

/** BE CredentialLoginInput·ChangePasswordInput과 같은 형식 규칙. 실제 인증은 서버가 한다 */
const usernameSchema = z
  .string()
  .trim()
  .min(4, '아이디는 4자 이상입니다.')
  .max(80, '아이디는 80자 이하입니다.');
const passwordSchema = z
  .string()
  .min(8, '비밀번호는 8자 이상입니다.')
  .max(64, '비밀번호는 64자 이하입니다.');

/** BE IsStrongPassword: 8~64자, 알파벳·숫자·특수문자 각 1개 이상 */
const strongPasswordSchema = passwordSchema
  .refine((v) => /[A-Za-z]/.test(v), '알파벳을 1자 이상 넣어 주세요.')
  .refine((v) => /\d/.test(v), '숫자를 1자 이상 넣어 주세요.')
  .refine((v) => /[^A-Za-z0-9]/.test(v), '특수문자를 1자 이상 넣어 주세요.');

export const loginSchema = z.object({ username: usernameSchema, password: passwordSchema });
export type LoginValues = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: passwordSchema,
    newPassword: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: '새 비밀번호가 서로 다릅니다.',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: '새 비밀번호는 현재 비밀번호와 달라야 합니다.',
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
