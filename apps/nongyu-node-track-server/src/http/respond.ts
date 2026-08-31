import type { FastifyReply } from "fastify";

export function writeOK(reply: FastifyReply, status: number, data: unknown): void {
  void reply.code(status).type("application/json; charset=utf-8").send({ ok: true, data });
}

export function writeFail(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string,
): void {
  void reply.code(status).type("application/json; charset=utf-8").send({
    ok: false,
    error: { code, message },
  });
}
