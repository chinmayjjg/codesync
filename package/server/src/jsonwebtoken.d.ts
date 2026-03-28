declare module "jsonwebtoken" {
  export function verify(
    token: string,
    secretOrPublicKey: string
  ): string | Record<string, unknown>;
}
