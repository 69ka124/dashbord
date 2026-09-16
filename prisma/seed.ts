import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CURRENT_YEAR = new Date().getFullYear();

const INCOME_KINDS = ["услуги", "лицензия", "возмещение", "АБ", "прочее"] as const;
const INCOME_STATUSES = ["получено", "получено", "получено", "план", "частично", "отменено"] as const;
const EXPENSE_CATEGORIES = ["подряд", "материалы", "лицензии", "прочее"] as const;
const WORK_STATUSES = ["в работе", "готово", "отменено"] as const;
const PAYMENT_STATUSES = ["оплачено", "оплачено", "не оплачено", "частично"] as const;

const PAYERS = [
  "Департамент маркетинга",
  "Бренд · Сбер",
  "Бренд · Nike RU",
  "Бренд · МТС",
  "Внутренний продакшн",
  "Лицензирование контента",
  "Партнёр · Ozon",
  "HR · корпоратив",
  "Digital · Яндекс",
  "Retail · X5 Group",
];

const PROJECTS = [
  "SBER-2026 · ролик «Весна»",
  "NIKE-AIR-MAX · кампания",
  "MTS-5G · спецпроект",
  "INTERNAL-REBRAND",
  "OZON-11 · промо",
  "YANDEX-PLUS · интеграция",
  "X5-LOYALTY · анимация",
  "HR-ONBOARD · серия роликов",
  "STOCK-LICENSE · пакет Q2",
  "PITCH-DECK · motion",
];

const COUNTERPARTIES = [
  {
    name: "ООО «Пиксель Продакшн»",
    inn: "7701234567",
    mainCategory: "подряд",
    responsible: "Иванова М.",
    limit: 1_500_000,
    usageRatio: 0.62,
  },
  {
    name: "ИП Смирнов А.В.",
    inn: "772233445566",
    mainCategory: "подряд",
    responsible: "Петров К.",
    limit: 1_500_000,
    usageRatio: 0.48,
  },
  {
    name: "ООО «Студия Звук»",
    inn: "7709876543",
    mainCategory: "подряд",
    responsible: "Иванова М.",
    limit: 1_500_000,
    usageRatio: 0.71,
  },
  {
    name: "ООО «Лицензия Медиа»",
    inn: "7711223344",
    mainCategory: "лицензии",
    responsible: "Сидорова А.",
    limit: 1_500_000,
    usageRatio: 0.35,
  },
  {
    name: "Фриланс · Козлова Е.",
    inn: null,
    mainCategory: "подряд",
    responsible: "Петров К.",
    limit: 1_500_000,
    usageRatio: 0.55,
  },
  {
    name: "ООО «ТехноРент»",
    inn: "7705554433",
    mainCategory: "материалы",
    responsible: "Кузнецов Д.",
    limit: 1_500_000,
    usageRatio: 0.44,
  },
  {
    name: "ООО «Креатив Лаб»",
    inn: "7706677889",
    mainCategory: "подряд",
    responsible: "Иванова М.",
    limit: 1_500_000,
    usageRatio: 0.58,
  },
  {
    name: "ООО «Маркет Интегратор»",
    inn: "7703344556",
    mainCategory: "подряд",
    responsible: "Сидорова А.",
    limit: 1_500_000,
    usageRatio: 0.94,
  },
  {
    name: "ООО «Пост Хаус»",
    inn: "7707788990",
    mainCategory: "подряд",
    responsible: "Петров К.",
    limit: 1_500_000,
    usageRatio: 1.12,
  },
];

const TASKS = [
  "Монтаж финальной версии",
  "Motion-графика блок 2",
  "Цветокор и мастер",
  "Запись закадрового голоса",
  "Саунд-дизайн и сведение",
  "3D-анимация продукта",
  "Аренда RED камеры · 3 смены",
  "Stock · архив footage",
  "Субтитры и локализация",
  "Адаптация под 9:16",
];

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function amount(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) / 1000) * 1000;
}

function dateAt(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function daysFromNow(offset: number): Date {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
}

async function clearDashboardData() {
  await prisma.auditLog.deleteMany();
  await prisma.vacationLeave.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.productionOrder.deleteMany();
  await prisma.designOrder.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.work.deleteMany();
  await prisma.expenseRecord.deleteMany();
  await prisma.incomeRecord.deleteMany();
  await prisma.counterpartyLimit.deleteMany();
  await prisma.counterparty.deleteMany();
  await prisma.workType.deleteMany();
  await prisma.accessGrant.deleteMany();
  await prisma.googleSheetSnapshot.deleteMany();
  await prisma.googleSyncConfig.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}

async function seedWorkTypes() {
  for (const name of ["Подряд", "Продакшн", "Дизайн", "Материалы", "Лицензии"]) {
    await prisma.workType.create({ data: { name, active: true } });
  }
}

async function seedCounterparties() {
  const created = [];
  for (const [index, row] of COUNTERPARTIES.entries()) {
    const cp = await prisma.counterparty.create({
      data: {
        code: String(index + 1),
        name: row.name,
        inn: row.inn,
        mainCategory: row.mainCategory,
        responsible: row.responsible,
        status: "активен",
        limitControl: "годовой",
        legalName: row.name,
        comment: "Синтетические демо-данные",
      },
    });

    for (const year of [CURRENT_YEAR - 1, CURRENT_YEAR]) {
      await prisma.counterpartyLimit.create({
        data: {
          counterpartyId: cp.id,
          year,
          annualLimit: row.limit,
        },
      });
    }

    created.push({ ...row, id: cp.id });
  }
  return created;
}

async function seedIncomeRecords() {
  let seq = 1;
  const rows = [];

  for (const year of [CURRENT_YEAR - 1, CURRENT_YEAR]) {
    for (let month = 1; month <= 12; month++) {
      const isFuture =
        year === CURRENT_YEAR &&
        (month > new Date().getMonth() + 1 ||
          (month === new Date().getMonth() + 1 && new Date().getDate() < 20));

      const count = isFuture ? 1 : year === CURRENT_YEAR - 1 ? 3 : 4;

      for (let i = 0; i < count; i++) {
        let status = pick(INCOME_STATUSES);
        if (isFuture) status = "план";
        if (year === CURRENT_YEAR - 1) status = status === "план" ? "получено" : status;

        const payer = pick(PAYERS);
        const project = pick(PROJECTS);
        const sum = amount(180_000, 2_800_000);

        rows.push({
          incomeCode: String(seq++),
          receivedAt: dateAt(year, month, pick([3, 7, 11, 14, 18, 22, 26])),
          incomeKind: pick(INCOME_KINDS),
          payer,
          project,
          amount: sum,
          status,
          source: payer.includes("Бренд") ? "Клиентский контракт" : "Внутренний заказ",
          documents:
            status === "получено"
              ? `Счёт №${1000 + seq} · акт ${month}.${year}`
              : status === "план"
                ? `КП · согласование до ${month}.${year}`
                : null,
        });
      }
    }
  }

  await prisma.incomeRecord.createMany({ data: rows });
  return rows.length;
}

async function seedExpenseRecords(
  counterparties: Array<(typeof COUNTERPARTIES)[number] & { id: string }>,
) {
  let seq = 1;
  const rows = [];
  const cpByName = new Map(counterparties.map((cp) => [cp.name, cp.id]));

  const manualHighlights = [
    {
      year: CURRENT_YEAR,
      month: 6,
      recipient: "ООО «Креатив Лаб»",
      task: "3D-анимация hero-сцены · финал",
      project: "SBER-2026 · ролик «Весна»",
      category: "подряд",
      totalToPay: 920_000,
      paymentStatus: "не оплачено",
      workStatus: "готово",
      comment: "Ждём подписание акта",
      dueDate: daysFromNow(-5),
    },
    {
      year: CURRENT_YEAR,
      month: 7,
      recipient: "ООО «Маркет Интегратор»",
      task: "Интеграция CG в master",
      project: "NIKE-AIR-MAX · кампания",
      category: "подряд",
      totalToPay: 640_000,
      paymentStatus: "не оплачено",
      workStatus: "в работе",
      comment: "Оплата после приёмки клиентом",
      dueDate: daysFromNow(1),
    },
    {
      year: CURRENT_YEAR,
      month: 5,
      recipient: "ООО «Пост Хаус»",
      task: "Финальный мастер · TVC 30s",
      project: "MTS-5G · спецпроект",
      category: "подряд",
      totalToPay: 380_000,
      paymentStatus: "частично",
      workStatus: "готово",
      comment: "Остаток 180k в августе",
    },
  ];

  for (const item of manualHighlights) {
    const paidAt =
      item.paymentStatus === "оплачено"
        ? dateAt(item.year, item.month + 1, 10)
        : item.paymentStatus === "частично"
          ? dateAt(item.year, item.month, 28)
          : null;

    rows.push({
      expenseCode: String(seq++),
      recipient: item.recipient,
      task: item.task,
      project: item.project,
      category: item.category,
      registeredAt: dateAt(item.year, item.month, 12),
      workStatus: item.workStatus,
      paymentStatus: item.paymentStatus,
      amount: item.totalToPay,
      totalToPay: item.totalToPay,
      plannedPayQuarter: Math.ceil(item.month / 3),
      paidAt,
      dueDate: item.dueDate ?? null,
      counterpartyId: cpByName.get(item.recipient) ?? null,
      materialUrl: item.category === "материалы" ? "https://drive.example/m/001" : null,
      documents: `JIRA PROD-${120 + seq}`,
      comment: item.comment,
      orderModule: "подряд",
      client: item.project.split(" · ")[0] ?? null,
    });
  }

  for (const year of [CURRENT_YEAR - 1, CURRENT_YEAR]) {
    for (let month = 1; month <= 12; month++) {
      if (year === CURRENT_YEAR && month > new Date().getMonth() + 2) continue;

      const count = year === CURRENT_YEAR - 1 ? 3 : 4;
      for (let i = 0; i < count; i++) {
        const cp = pick(counterparties);
        let paymentStatus = pick(PAYMENT_STATUSES);
        if (year === CURRENT_YEAR - 1) paymentStatus = "оплачено";

        const total = amount(95_000, 1_150_000);
        const paidAt =
          paymentStatus === "оплачено"
            ? dateAt(year, month, pick([20, 25, 28]))
            : paymentStatus === "частично"
              ? dateAt(year, month, 18)
              : null;

        rows.push({
          expenseCode: String(seq++),
          recipient: cp.name,
          task: pick(TASKS),
          project: pick(PROJECTS),
          category: pick(EXPENSE_CATEGORIES),
          registeredAt: dateAt(year, month, pick([2, 6, 9, 13, 17, 21])),
          workStatus: pick(WORK_STATUSES),
          paymentStatus,
          amount: total,
          totalToPay: total,
          plannedPayQuarter: Math.ceil(month / 3),
          paidAt,
          dueDate:
            paymentStatus === "не оплачено" && Math.random() > 0.7
              ? daysFromNow(pick([-3, 1, 2, 14]))
              : null,
          counterpartyId: cp.id,
          materialUrl: Math.random() > 0.7 ? `https://drive.example/d/${year}${month}${i}` : null,
          documents: `JIRA PROD-${800 + seq}`,
          comment: Math.random() > 0.6 ? "Согласовано в Slack #finance" : null,
          orderModule: Math.random() > 0.7 ? pick(["подряд", "продакшн", "дизайн"]) : null,
          client: Math.random() > 0.5 ? pick(PAYERS) : null,
        });
      }
    }
  }

  await prisma.expenseRecord.createMany({ data: rows });
  return rows.length;
}

async function seedOperationalData() {
  await prisma.productionOrder.createMany({
    data: [
      {
        orderCode: "1",
        receivedAt: daysFromNow(-45),
        project: "SBER-2026 · ролик «Весна»",
        client: "Бренд · Сбер",
        workType: "Монтаж",
        status: "в работе",
        income: 920_000,
        deadline: daysFromNow(-4),
        comment: "Демо: просроченный дедлайн",
      },
      {
        orderCode: "2",
        receivedAt: daysFromNow(-14),
        project: "NIKE-AIR-MAX · кампания",
        client: "Бренд · Nike RU",
        workType: "Съёмка",
        status: "в работе",
        income: 1_150_000,
        deadline: daysFromNow(2),
        comment: "Демо: дедлайн через 2 дня",
      },
      {
        orderCode: "3",
        receivedAt: daysFromNow(-7),
        project: "INTERNAL-REBRAND",
        client: "Внутренний продакшн",
        workType: "Монтаж",
        status: "готово",
        income: 480_000,
        deadline: daysFromNow(-1),
      },
    ],
  });

  await prisma.designOrder.createMany({
    data: [
      {
        orderCode: "1",
        receivedAt: daysFromNow(-30),
        project: "MTS-5G · спецпроект",
        client: "Бренд · МТС",
        status: "согласование",
        income: 640_000,
        deadline: daysFromNow(-2),
        comment: "Демо: просроченный дедлайн",
      },
      {
        orderCode: "2",
        receivedAt: daysFromNow(-10),
        project: "YANDEX-PLUS · интеграция",
        client: "Digital · Яндекс",
        status: "в работе",
        income: 390_000,
        deadline: daysFromNow(1),
        comment: "Демо: дедлайн завтра",
      },
    ],
  });

  await prisma.purchaseItem.createMany({
    data: [
      {
        type: "подписка",
        title: "Adobe Creative Cloud · команда",
        subscription: "ежемесячная",
        paymentDate: daysFromNow(-3),
        unitPrice: 42_000,
        quantity: 1,
        lineTotal: 42_000,
        priority: "высокий",
        status: "к оплате",
        comment: "Демо: просроченная подписка",
      },
      {
        type: "софт",
        title: "Figma Organization",
        subscription: "годовая",
        paymentDate: daysFromNow(2),
        unitPrice: 186_000,
        quantity: 1,
        lineTotal: 186_000,
        priority: "средний",
        status: "план",
        comment: "Демо: продление через 2 дня",
      },
      {
        type: "подписка",
        title: "Frame.io Team",
        subscription: "ежемесячная",
        paymentDate: daysFromNow(0),
        unitPrice: 18_500,
        quantity: 1,
        lineTotal: 18_500,
        priority: "высокий",
        status: "к оплате",
        comment: "Демо: списание сегодня",
      },
      {
        type: "техника",
        title: "RED Komodo 6K",
        subscription: "нет",
        paymentDate: daysFromNow(30),
        unitPrice: 890_000,
        quantity: 1,
        lineTotal: 890_000,
        priority: "низкий",
        status: "план",
      },
    ],
  });

  const employees = await Promise.all([
    prisma.employee.create({
      data: { fullName: "Иванова Мария", role: "руководитель продакшна", sortOrder: 1 },
    }),
    prisma.employee.create({
      data: { fullName: "Петров Кирилл", role: "монтажёр", sortOrder: 2 },
    }),
    prisma.employee.create({
      data: { fullName: "Козлова Елена", role: "дизайнер", sortOrder: 3 },
    }),
    prisma.employee.create({
      data: { fullName: "Сидорова Анна", role: "продюсер", sortOrder: 4 },
    }),
  ]);

  await prisma.vacationLeave.createMany({
    data: [
      {
        employeeId: employees[0]!.id,
        startDate: daysFromNow(14),
        endDate: daysFromNow(28),
        calendarDays: 15,
        workingDays: 11,
        leaveType: "Основной отпуск",
        status: "План",
        substitute: "Петров К.",
      },
      {
        employeeId: employees[1]!.id,
        startDate: daysFromNow(-5),
        endDate: daysFromNow(4),
        calendarDays: 10,
        workingDays: 7,
        leaveType: "Основной отпуск",
        status: "Утверждён",
      },
      {
        employeeId: employees[2]!.id,
        startDate: daysFromNow(2),
        endDate: daysFromNow(5),
        calendarDays: 4,
        workingDays: 3,
        leaveType: "Отгул",
        status: "План",
        substitute: "Сидорова А.",
        comment: "Демо: отпуск без замены в одном кейсе",
      },
    ],
  });
}

async function main() {
  console.log("Очистка старых данных…");
  await clearDashboardData();

  if (process.argv.includes("--clear-only")) {
    console.log("Все данные очищены (включая доступы, пользователей и Google-синк).");
    return;
  }

  console.log("Типы работ…");
  await seedWorkTypes();

  console.log("Контрагенты и лимиты…");
  const counterparties = await seedCounterparties();

  console.log("Доходы…");
  const incomeCount = await seedIncomeRecords();

  console.log("Расходы…");
  const expenseCount = await seedExpenseRecords(counterparties);

  console.log("Продакшн, дизайн, закупки, отпуска…");
  await seedOperationalData();

  const [cpCount, prodCount, purchaseCount, leaveCount] = await Promise.all([
    prisma.counterparty.count(),
    prisma.productionOrder.count(),
    prisma.purchaseItem.count(),
    prisma.vacationLeave.count(),
  ]);

  console.log(
    `Готово: ${incomeCount} доходов, ${expenseCount} расходов, ${cpCount} к/а, ${prodCount} продакшн, ${purchaseCount} закупок, ${leaveCount} отпусков.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
