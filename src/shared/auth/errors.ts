export class MissingAppUserError extends Error {
  readonly supabaseUserId: string;
  readonly email: string | null;

  constructor(supabaseUserId: string, email: string | null) {
    super("ไม่พบบัญชีผู้ใช้ในระบบ Rubber ERP กรุณาติดต่อผู้ดูแลระบบ");
    this.name = "MissingAppUserError";
    this.supabaseUserId = supabaseUserId;
    this.email = email;
  }
}

export class InactiveAccountError extends Error {
  constructor() {
    super("บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ");
    this.name = "InactiveAccountError";
  }
}
