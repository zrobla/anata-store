import { NextResponse } from "next/server";

type ContactSubject =
  | "PRODUCT_ADVICE"
  | "ORDER_TRACKING"
  | "AFTER_SALES"
  | "DELIVERY"
  | "PARTNERSHIP"
  | "OTHER";

type ContactPayload = {
  full_name?: string;
  phone?: string;
  email?: string;
  subject?: ContactSubject;
  order_number?: string;
  product_model?: string;
  budget_fcfa?: string;
  message?: string;
};

const SUBJECTS = new Set<ContactSubject>([
  "PRODUCT_ADVICE",
  "ORDER_TRACKING",
  "AFTER_SALES",
  "DELIVERY",
  "PARTNERSHIP",
  "OTHER"
]);

function asText(value: unknown, max = 500): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, max);
}

export async function POST(request: Request) {
  let payload: ContactPayload = {};
  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ message: "Payload invalide." }, { status: 400 });
  }

  const fullName = asText(payload.full_name, 120);
  const phone = asText(payload.phone, 40);
  const email = asText(payload.email, 120);
  const subject = asText(payload.subject, 40) as ContactSubject;
  const orderNumber = asText(payload.order_number, 80);
  const productModel = asText(payload.product_model, 120);
  const budget = asText(payload.budget_fcfa, 40);
  const message = asText(payload.message, 2000);

  if (!fullName || !phone || !subject || !message) {
    return NextResponse.json({ message: "Champs obligatoires manquants." }, { status: 400 });
  }
  if (!SUBJECTS.has(subject)) {
    return NextResponse.json({ message: "Objet de demande invalide." }, { status: 400 });
  }
  if (message.length < 12) {
    return NextResponse.json({ message: "Le message doit contenir au moins 12 caracteres." }, { status: 400 });
  }
  if (subject === "ORDER_TRACKING" && !orderNumber) {
    return NextResponse.json({ message: "Le numero de commande est requis pour le suivi." }, { status: 400 });
  }
  if ((subject === "PRODUCT_ADVICE" || subject === "AFTER_SALES") && !productModel) {
    return NextResponse.json({ message: "Le modele concerne est requis pour cette demande." }, { status: 400 });
  }
  if (subject === "PRODUCT_ADVICE" && !budget) {
    return NextResponse.json({ message: "Le budget est requis pour un conseil achat." }, { status: 400 });
  }

  const ticketId = `ANATA-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto
    .randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;

  // MVP: endpoint local de collecte.
  // Une integration email/CRM peut ensuite reutiliser ce payload.
  return NextResponse.json(
    {
      ticket_id: ticketId,
      message: "Demande enregistree."
    },
    { status: 201 }
  );
}
