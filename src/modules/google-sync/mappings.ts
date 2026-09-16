export const SHEET_TABS = {
  income: "Доходы",
  expense: "Расходы",
  counterparty: "К/А",
  purchase: "Закупки",
} as const;

export const INCOME_HEADERS = [
  "ID",
  "Дата",
  "Вид",
  "Плательщик",
  "Проект",
  "Сумма",
  "Статус",
  "Документы",
  "Источник",
] as const;

export const EXPENSE_HEADERS = [
  "ID",
  "Дата рег.",
  "Получатель",
  "Задача",
  "Проект",
  "Категория",
  "Статус работы",
  "Статус оплаты",
  "Сумма",
  "К оплате",
  "Квартал оплаты",
  "Оплачено",
  "Срок",
  "Jira",
  "Комментарий",
] as const;

export const COUNTERPARTY_HEADERS = [
  "ID",
  "Название",
  "ИНН",
  "Категория",
  "Ответственный",
  "Статус",
  "Комментарий",
] as const;

export const PURCHASE_HEADERS = [
  "ID",
  "Тип",
  "Название",
  "Дата оплаты",
  "Цена",
  "Кол-во",
  "Сумма",
  "Подписка",
  "Приоритет",
  "Статус",
  "Комментарий",
] as const;

export const ALL_SHEET_TITLES = Object.values(SHEET_TABS);
