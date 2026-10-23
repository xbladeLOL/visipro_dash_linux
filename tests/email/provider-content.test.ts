import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  sendMail: vi.fn(),
  close: vi.fn(),
  createTransport: vi.fn(),
}));
vi.mock("visipro-smtp", () => ({
  default: { createTransport: mocks.createTransport },
}));
import { getProvider } from "@/lib/email/provider";
describe("SMTP message content without a network connection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });
  it("supplies both safe HTML and text with the mockup link and opposition footer", async () => {
    for (const [key, value] of Object.entries({
      EMAIL_DELIVERY_MODE: "smtp",
      EMAIL_REAL_SEND_ENABLED: "true",
      EMAIL_FROM: "sender@example.test",
      EMAIL_REPLY_TO: "sender@example.test",
      EMAIL_SENDER_IDENTITY: "VisiPro <Identity>",
      EMAIL_PUBLIC_URL: "https://dashboard.example.test",
      SMTP_HOST: "smtp.example.test",
      SMTP_USER: "test-user",
      SMTP_PASSWORD: "fixture-only",
      EMAIL_UNSUBSCRIBE_SECRET: "fixture-signature-secret-32-characters-long",
    }))
      vi.stubEnv(key, value);
    mocks.createTransport.mockReturnValue({
      sendMail: mocks.sendMail,
      close: mocks.close,
    });
    mocks.sendMail.mockResolvedValue({
      accepted: ["recipient@example.test"],
      messageId: "fixture-message",
      response: "250 Accepted",
    });
    const result = await getProvider().send(
      {
        id: "fixture",
        recipientKey: "fixture-key",
        recipient: "recipient@example.test",
        subject: "Proposition",
        body: "Bonjour, voici une proposition.",
        mockupUrl: "https://example.test/demo",
      },
      "fixture-attempt",
    );
    expect(result.outcome).toBe("accepted");
    const message = mocks.sendMail.mock.calls[0][0];
    expect(message.html).toContain(">Découvrir la maquette</a>");
    expect(message.html).toContain('href="https://example.test/demo"');
    expect(message.html).toContain("Ne plus recevoir de sollicitations");
    expect(message.html).toContain("VisiPro &lt;Identity&gt;");
    expect(message.text).toContain(
      "Découvrir la maquette : https://example.test/demo",
    );
    expect(message.text).toContain("/email-unsubscribe/");
    expect(mocks.close).toHaveBeenCalledOnce();
  });
});
