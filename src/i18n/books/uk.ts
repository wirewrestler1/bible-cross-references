import type { BookNames } from './types.ts';

/**
 * The books in Ukrainian.
 *
 * Names follow the tradition a Ukrainian reader meets in print — Ohienko's, which is the one
 * nearly every Ukrainian Bible in circulation uses — so that a reader recognises the axis of the
 * arcs without reading it twice.
 *
 * Aliases are the abbreviations someone actually types. They are matched after accents are
 * folded away, and Ukrainian folds further than most: `ї` becomes `і` and `й` becomes `и`, so
 * `Йов` is found by `иов` as well as by `йов`. That costs nothing here because no two books come
 * together under it — `bookNameCollisions` is what says so, and it runs over this file in
 * `npm run check`.
 */
export const ukBooks: BookNames = {
  Gen: { name: 'Буття', abbreviation: 'Бут', aliases: ['бут', 'бт'] },
  Exod: { name: 'Вихід', abbreviation: 'Вих', aliases: ['вих', 'вх'] },
  Lev: { name: 'Левит', abbreviation: 'Лев', aliases: ['лев', 'лв'] },
  Num: { name: 'Числа', abbreviation: 'Чис', aliases: ['чис', 'чс'] },
  Deut: {
    name: 'Повторення Закону',
    abbreviation: 'Повт',
    aliases: ['повт', 'пз', 'второзаконня'],
  },
  Josh: { name: 'Ісус Навин', abbreviation: 'Нав', aliases: ['нав', 'іс нав'] },
  Judg: { name: 'Суддів', abbreviation: 'Суд', aliases: ['суд', 'судді', 'книга суддів'] },
  Ruth: { name: 'Рут', abbreviation: 'Рут', aliases: ['рут', 'рт'] },
  '1Sam': { name: '1 Самуїлова', abbreviation: '1Сам', aliases: ['1сам'] },
  '2Sam': { name: '2 Самуїлова', abbreviation: '2Сам', aliases: ['2сам'] },
  '1Kgs': { name: '1 Царів', abbreviation: '1Цар', aliases: ['1цар'] },
  '2Kgs': { name: '2 Царів', abbreviation: '2Цар', aliases: ['2цар'] },
  '1Chr': { name: '1 Хронік', abbreviation: '1Хр', aliases: ['1хр', '1хрон'] },
  '2Chr': { name: '2 Хронік', abbreviation: '2Хр', aliases: ['2хр', '2хрон'] },
  Ezra: { name: 'Ездра', abbreviation: 'Езд', aliases: ['езд', 'ездра', 'ездри'] },
  Neh: { name: 'Неемія', abbreviation: 'Неем', aliases: ['неем', 'неемії', 'неєм'] },
  Esth: { name: 'Естер', abbreviation: 'Ест', aliases: ['ест'] },
  Job: { name: 'Йов', abbreviation: 'Йов', aliases: ['йов'] },
  Ps: {
    name: 'Псалми',
    referenceName: 'Псалом',
    abbreviation: 'Пс',
    aliases: ['пс', 'псалом', 'псалми', 'псалтир'],
  },
  Prov: {
    name: 'Приповісті',
    abbreviation: 'Прип',
    aliases: ['прип', 'пр', 'приповістей', 'притчі'],
  },
  Eccl: {
    name: 'Екклезіяст',
    abbreviation: 'Еккл',
    aliases: ['еккл', 'екл', 'еклезіаст', 'проповідник'],
  },
  Song: { name: 'Пісня над піснями', abbreviation: 'Пісн', aliases: ['пісн', 'пнп'] },
  Isa: { name: 'Ісая', abbreviation: 'Іс', aliases: ['іс', 'ісая', 'ісаї'] },
  Jer: { name: 'Єремія', abbreviation: 'Єр', aliases: ['єр', 'єремія', 'єремії'] },
  Lam: { name: 'Плач Єремії', abbreviation: 'Плач', aliases: ['плач', 'пл'] },
  Ezek: { name: 'Єзекіїль', abbreviation: 'Єз', aliases: ['єз', 'єзек'] },
  Dan: { name: 'Даниїл', abbreviation: 'Дан', aliases: ['дан', 'даниїла'] },
  Hos: { name: 'Осія', abbreviation: 'Ос', aliases: ['ос', 'осія', 'осії'] },
  Joel: { name: 'Йоіл', abbreviation: 'Йоіл', aliases: ['йоіл', 'йл'] },
  Amos: { name: 'Амос', abbreviation: 'Ам', aliases: ['ам', 'амос'] },
  // Ohienko's Овдій, with the commoner Авдій and its abbreviation alongside.
  Obad: {
    name: 'Овдій',
    abbreviation: 'Овд',
    aliases: ['овд', 'овдій', 'авдій', 'авд'],
  },
  Jonah: { name: 'Йона', abbreviation: 'Йона', aliases: ['йона', 'йони'] },
  Mic: { name: 'Михей', abbreviation: 'Мих', aliases: ['мих', 'михей', 'михея'] },
  Nah: { name: 'Наум', abbreviation: 'Наум', aliases: ['наум', 'нм', 'наума'] },
  Hab: { name: 'Авакум', abbreviation: 'Авак', aliases: ['авак', 'ав', 'авакум', 'аввакум'] },
  Zeph: { name: 'Софонія', abbreviation: 'Соф', aliases: ['соф', 'софонія'] },
  Hag: { name: 'Огій', abbreviation: 'Ог', aliases: ['ог', 'огій', 'аггей'] },
  Zech: { name: 'Захарія', abbreviation: 'Зах', aliases: ['зах', 'захарія', 'захарії'] },
  Mal: { name: 'Малахія', abbreviation: 'Мал', aliases: ['мал', 'малахії'] },
  '1Esd': { name: '1 Ездри', abbreviation: '1Езд', aliases: ['1езд', '1ездри', '1ездра'] },
  PrMan: {
    name: 'Молитва Манасії',
    abbreviation: 'МолМан',
    aliases: ['молман', 'манасія', 'манасії', 'молитваманасії'],
  },
  Tob: { name: 'Товит', abbreviation: 'Тов', aliases: ['тов', 'товит', 'товита', 'товія'] },
  Jdt: { name: 'Юдита', abbreviation: 'Юдт', aliases: ['юдт', 'юдита', 'юдит', 'юдиф', 'юдифі'] },
  EsthGr: { name: 'Естер (грецька)', abbreviation: 'ЕстГр', aliases: ['естгр', 'естергрецька'] },
  '1Macc': {
    name: '1 Маккавеїв',
    abbreviation: '1Мак',
    aliases: ['1мак', '1маккавеїв', '1макавеїв'],
  },
  '2Macc': {
    name: '2 Маккавеїв',
    abbreviation: '2Мак',
    aliases: ['2мак', '2маккавеїв', '2макавеїв'],
  },
  '3Macc': {
    name: '3 Маккавеїв',
    abbreviation: '3Мак',
    aliases: ['3мак', '3маккавеїв', '3макавеїв'],
  },
  AddPs: { name: 'Псалом 151', abbreviation: 'Пс151', aliases: ['пс151', 'псалом151'] },
  Wis: {
    name: 'Мудрість',
    abbreviation: 'Муд',
    aliases: ['муд', 'мудрість', 'мудрістьсоломона', 'премудрість'],
  },
  Sir: {
    name: 'Сирах',
    abbreviation: 'Сир',
    aliases: ['сир', 'сирах', 'сираха', 'ісуссирах', 'еклезіястик'],
  },
  Bar: { name: 'Варух', abbreviation: 'Вар', aliases: ['вар', 'варух', 'варуха'] },
  DanGr: { name: 'Даниїл (грецький)', abbreviation: 'ДанГр', aliases: ['дангр', 'даниїлгрецький'] },
  '4Macc': {
    name: '4 Маккавеїв',
    abbreviation: '4Мак',
    aliases: ['4мак', '4маккавеїв', '4макавеїв'],
  },
  Matt: { name: 'Матвія', abbreviation: 'Мт', aliases: ['мт', 'матв', 'матвія', 'матей'] },
  Mark: { name: 'Марка', abbreviation: 'Мк', aliases: ['мк', 'марка'] },
  Luke: { name: 'Луки', abbreviation: 'Лк', aliases: ['лк', 'луки'] },
  John: { name: 'Івана', abbreviation: 'Ів', aliases: ['ів', 'івана', 'йоан', 'йоана'] },
  Acts: { name: 'Дії', abbreviation: 'Дії', aliases: ['дії', 'ді', 'діяння'] },
  Rom: { name: 'Римлян', abbreviation: 'Рим', aliases: ['рим', 'римлян'] },
  '1Cor': { name: '1 Коринтян', abbreviation: '1Кор', aliases: ['1кор'] },
  '2Cor': { name: '2 Коринтян', abbreviation: '2Кор', aliases: ['2кор'] },
  Gal: { name: 'Галатів', abbreviation: 'Гал', aliases: ['гал', 'галатів'] },
  Eph: { name: 'Ефесян', abbreviation: 'Еф', aliases: ['еф', 'ефесян'] },
  Phil: { name: 'Филип’ян', abbreviation: 'Флп', aliases: ['флп', 'филипян'] },
  Col: { name: 'Колосян', abbreviation: 'Кол', aliases: ['кол', 'колосян'] },
  '1Thess': { name: '1 Солунян', abbreviation: '1Сол', aliases: ['1сол', '1фес'] },
  '2Thess': { name: '2 Солунян', abbreviation: '2Сол', aliases: ['2сол', '2фес'] },
  '1Tim': { name: '1 Тимофія', abbreviation: '1Тим', aliases: ['1тим'] },
  '2Tim': { name: '2 Тимофія', abbreviation: '2Тим', aliases: ['2тим'] },
  Titus: { name: 'Тита', abbreviation: 'Тит', aliases: ['тит', 'тита'] },
  Phlm: { name: 'Филимона', abbreviation: 'Флм', aliases: ['флм', 'филимона'] },
  Heb: { name: 'Євреїв', abbreviation: 'Євр', aliases: ['євр', 'євреїв'] },
  Jas: { name: 'Якова', abbreviation: 'Як', aliases: ['як', 'якова'] },
  '1Pet': { name: '1 Петра', abbreviation: '1Пет', aliases: ['1пет'] },
  '2Pet': { name: '2 Петра', abbreviation: '2Пет', aliases: ['2пет'] },
  '1John': { name: '1 Івана', abbreviation: '1Ів', aliases: ['1ів'] },
  '2John': { name: '2 Івана', abbreviation: '2Ів', aliases: ['2ів'] },
  '3John': { name: '3 Івана', abbreviation: '3Ів', aliases: ['3ів'] },
  Jude: { name: 'Юди', abbreviation: 'Юди', aliases: ['юди', 'юд'] },
  Rev: {
    name: 'Об’явлення',
    abbreviation: 'Об',
    aliases: ['об', 'обявлення', 'апокаліпсис', 'одкровення'],
  },
};
