// Иконки категорий (Lucide, ISC). Ключ хранится в таблице, в колонке icon.
// Сгруппированы для выбора в редакторе категорий.
import {
  ShoppingCart, Utensils, Coffee, Pizza, Beer, Cake, Apple, Carrot, Wine,
  House, Receipt, Zap, Droplet, Sofa, Hammer, Wrench,
  Wifi, Router, Smartphone, GlobeLock, Cloud, Server, Tv, TvMinimalPlay, Laptop, KeyRound,
  Car, Fuel, Bus, TrainFront, Plane, Bike, CarTaxiFront, SquareParking, Ship,
  HeartPulse, Pill, Stethoscope, Syringe, Hospital, Sparkles, Scissors, Dumbbell, Glasses,
  Shirt, Gem, Baby, ToyBrick, School, PawPrint, Cat, Dog,
  Gift, Flower2, Clapperboard, Popcorn, Ticket, Gamepad2, Music, BookOpen, GraduationCap, Palette, Luggage, TreePalm, Tent, HandHeart,
  Landmark, CreditCard, Percent, Repeat, Shield, Building2, Package, Tag, Circle,
  Briefcase, Wallet, PiggyBank, TrendingUp, Coins, Banknote, HandCoins, Undo2,
} from 'lucide-vue-next'

export const ICON_GROUPS = [
  { title: 'Еда', icons: { 'shopping-cart': ShoppingCart, utensils: Utensils, coffee: Coffee, pizza: Pizza, beer: Beer, wine: Wine, cake: Cake, apple: Apple, carrot: Carrot } },
  {
    title: 'Дом',
    icons: { house: House, receipt: Receipt, zap: Zap, droplet: Droplet, sofa: Sofa, hammer: Hammer, wrench: Wrench },
  },
  {
    title: 'Связь и подписки',
    icons: {
      wifi: Wifi, router: Router, smartphone: Smartphone, vpn: GlobeLock, cloud: Cloud, server: Server,
      tv: Tv, streaming: TvMinimalPlay, laptop: Laptop, key: KeyRound,
    },
  },
  { title: 'Транспорт', icons: { car: Car, fuel: Fuel, taxi: CarTaxiFront, parking: SquareParking, bus: Bus, train: TrainFront, plane: Plane, ship: Ship, bike: Bike } },
  {
    title: 'Здоровье и красота',
    icons: { 'heart-pulse': HeartPulse, pill: Pill, stethoscope: Stethoscope, syringe: Syringe, hospital: Hospital, sparkles: Sparkles, scissors: Scissors, dumbbell: Dumbbell, glasses: Glasses },
  },
  { title: 'Семья', icons: { shirt: Shirt, gem: Gem, baby: Baby, toys: ToyBrick, school: School, 'paw-print': PawPrint, cat: Cat, dog: Dog } },
  {
    title: 'Досуг',
    icons: {
      gift: Gift, flower: Flower2, film: Clapperboard, popcorn: Popcorn, ticket: Ticket, gamepad: Gamepad2, music: Music, book: BookOpen,
      education: GraduationCap, palette: Palette, luggage: Luggage, vacation: TreePalm, tent: Tent, charity: HandHeart,
    },
  },
  {
    title: 'Финансы',
    icons: { landmark: Landmark, 'credit-card': CreditCard, percent: Percent, repeat: Repeat, shield: Shield, building: Building2, package: Package, tag: Tag },
  },
  {
    title: 'Доходы',
    icons: { briefcase: Briefcase, wallet: Wallet, 'piggy-bank': PiggyBank, 'trending-up': TrendingUp, coins: Coins, banknote: Banknote, 'hand-coins': HandCoins, refund: Undo2 },
  },
]

export const ICONS = Object.assign({}, ...ICON_GROUPS.map((g) => g.icons))

// неизвестный ключ (или эмодзи из старых данных) — нейтральный кружок
export const iconComponent = (key) => ICONS[key] ?? Circle
