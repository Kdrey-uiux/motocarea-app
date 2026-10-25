/**
 * App icons (staff console and rider dashboard): iOS-style filled icons (Phosphor) under the
 * names the screens already used (the old lucide names), so they import from here instead of lucide-react.
 * Small UI marks (check, x, plus, arrows, carets, search, menu) use the bold weight,
 * like iOS system glyphs; everything else is filled.
 */
import { forwardRef, type ComponentType, type SVGProps } from 'react';
import {
  WarningCircle,
  Warning,
  Archive as PhArchive,
  ArrowLeft as PhArrowLeft,
  ArrowRight as PhArrowRight,
  ArrowUpRight as PhArrowUpRight,
  Bell as PhBell,
  BellRinging,
  Motorcycle,
  BookOpen as PhBookOpen,
  CalendarBlank,
  CalendarCheck,
  Check as PhCheck,
  Checks,
  CheckCircle as PhCheckCircle,
  CaretDown,
  CaretRight,
  XCircle as PhXCircle,
  Clock as PhClock,
  Copy as PhCopy,
  DownloadSimple,
  PencilSimple,
  PencilSimpleLine,
  Eye as PhEye,
  EyeSlash,
  FileText as PhFileText,
  Gauge as PhGauge,
  ClockCounterClockwise,
  Tray,
  Info as PhInfo,
  Kanban as PhKanban,
  Key as PhKey,
  Stack,
  SquaresFour,
  ListBullets,
  CircleNotch,
  Lock as PhLock,
  SignOut,
  Envelope,
  List as PhList,
  ChatCircleDots,
  ChatCenteredText,
  Desktop,
  Moon as PhMoon,
  DotsThree,
  Phone as PhPhone,
  Plus as PhPlus,
  Power as PhPower,
  Printer as PhPrinter,
  ArrowsClockwise,
  ArrowBendUpLeft,
  FloppyDisk,
  MagnifyingGlass,
  PaperPlaneRight,
  ShieldWarning,
  ShieldCheck as PhShieldCheck,
  Stamp as PhStamp,
  Star as PhStar,
  Sun as PhSun,
  Ticket as PhTicket,
  Trash,
  User as PhUser,
  UserCheck as PhUserCheck,
  UserPlus as PhUserPlus,
  UserMinus,
  Users as PhUsers,
  Wrench as PhWrench,
  X as PhX,
  Lightning,
  Pulse,
  CalendarDots,
  CaretLeft,
  CaretUp,
  CreditCard as PhCreditCard,
  Disc as PhDisc,
  Drop,
  Question,
  MapPin as PhMapPin,
  NavigationArrow,
  Broadcast,
  Gear,
  Shield as PhShield,
  SlidersHorizontal,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';

/** Props the console passes to icons (className and the occasional title/aria attributes) */
export type ConsoleIconProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & { strokeWidth?: number | string };
/** Replaces lucide's LucideIcon type */
export type LucideIcon = ComponentType<ConsoleIconProps>;

function make(Icon: PhosphorIcon, weight: 'fill' | 'bold', name: string): LucideIcon {
  // strokeWidth is a lucide prop; Phosphor draws its own weight
  const Wrapped = forwardRef<SVGSVGElement, ConsoleIconProps>(({ strokeWidth: _strokeWidth, ...props }, ref) => (
    <Icon ref={ref} weight={weight} aria-hidden={props['aria-label'] ? undefined : true} {...(props as object)} />
  ));
  Wrapped.displayName = name;
  return Wrapped as unknown as LucideIcon;
}

const fill = (Icon: PhosphorIcon, name: string) => make(Icon, 'fill', name);
const bold = (Icon: PhosphorIcon, name: string) => make(Icon, 'bold', name);

export const AlertCircle = fill(WarningCircle, 'AlertCircle');
export const AlertTriangle = fill(Warning, 'AlertTriangle');
export const Archive = fill(PhArchive, 'Archive');
export const ArrowLeft = bold(PhArrowLeft, 'ArrowLeft');
export const ArrowRight = bold(PhArrowRight, 'ArrowRight');
export const ArrowUpRight = bold(PhArrowUpRight, 'ArrowUpRight');
export const Bell = fill(PhBell, 'Bell');
export const BellRing = fill(BellRinging, 'BellRing');
export const Bike = fill(Motorcycle, 'Bike');
export const BookOpen = fill(PhBookOpen, 'BookOpen');
export const Calendar = fill(CalendarBlank, 'Calendar');
export const CalendarClock = fill(CalendarCheck, 'CalendarClock');
export const Check = bold(PhCheck, 'Check');
export const CheckCheck = bold(Checks, 'CheckCheck');
export const CheckCircle = fill(PhCheckCircle, 'CheckCircle');
export const CheckCircle2 = fill(PhCheckCircle, 'CheckCircle2');
export const ChevronDown = bold(CaretDown, 'ChevronDown');
export const ChevronRight = bold(CaretRight, 'ChevronRight');
export const CircleX = fill(PhXCircle, 'CircleX');
export const Clock = fill(PhClock, 'Clock');
export const Copy = fill(PhCopy, 'Copy');
export const Download = bold(DownloadSimple, 'Download');
export const Edit = fill(PencilSimple, 'Edit');
export const Edit3 = fill(PencilSimpleLine, 'Edit3');
export const Eye = fill(PhEye, 'Eye');
export const EyeOff = fill(EyeSlash, 'EyeOff');
export const FileText = fill(PhFileText, 'FileText');
export const Gauge = fill(PhGauge, 'Gauge');
export const History = bold(ClockCounterClockwise, 'History');
export const Inbox = fill(Tray, 'Inbox');
export const Info = fill(PhInfo, 'Info');
export const Kanban = fill(PhKanban, 'Kanban');
export const KeyRound = fill(PhKey, 'KeyRound');
export const Layers = fill(Stack, 'Layers');
export const LayoutGrid = fill(SquaresFour, 'LayoutGrid');
export const List = bold(ListBullets, 'List');
export const Loader2 = bold(CircleNotch, 'Loader2');
export const Lock = fill(PhLock, 'Lock');
export const LogOut = bold(SignOut, 'LogOut');
export const Mail = fill(Envelope, 'Mail');
export const Menu = bold(PhList, 'Menu');
export const MessageSquare = fill(ChatCircleDots, 'MessageSquare');
export const MessageSquareText = fill(ChatCenteredText, 'MessageSquareText');
export const Monitor = fill(Desktop, 'Monitor');
export const Moon = fill(PhMoon, 'Moon');
export const MoreHorizontal = bold(DotsThree, 'MoreHorizontal');
export const Phone = fill(PhPhone, 'Phone');
export const Plus = bold(PhPlus, 'Plus');
export const Power = bold(PhPower, 'Power');
export const Printer = fill(PhPrinter, 'Printer');
export const RefreshCw = bold(ArrowsClockwise, 'RefreshCw');
export const Reply = bold(ArrowBendUpLeft, 'Reply');
export const Save = fill(FloppyDisk, 'Save');
export const Search = bold(MagnifyingGlass, 'Search');
export const Send = fill(PaperPlaneRight, 'Send');
export const ShieldAlert = fill(ShieldWarning, 'ShieldAlert');
export const ShieldCheck = fill(PhShieldCheck, 'ShieldCheck');
export const Stamp = fill(PhStamp, 'Stamp');
export const Star = fill(PhStar, 'Star');
export const Sun = fill(PhSun, 'Sun');
export const Ticket = fill(PhTicket, 'Ticket');
export const Trash2 = fill(Trash, 'Trash2');
export const User = fill(PhUser, 'User');
export const UserCheck = fill(PhUserCheck, 'UserCheck');
export const UserPlus = fill(PhUserPlus, 'UserPlus');
export const UserX = fill(UserMinus, 'UserX');
export const Users = fill(PhUsers, 'Users');
export const Wrench = fill(PhWrench, 'Wrench');
export const X = bold(PhX, 'X');
export const Zap = fill(Lightning, 'Zap');
export const Activity = fill(Pulse, 'Activity');
export const CalendarSync = fill(CalendarDots, 'CalendarSync');
export const ChevronLeft = bold(CaretLeft, 'ChevronLeft');
export const ChevronUp = bold(CaretUp, 'ChevronUp');
export const CreditCard = fill(PhCreditCard, 'CreditCard');
export const Disc = fill(PhDisc, 'Disc');
export const Droplets = fill(Drop, 'Droplets');
export const HelpCircle = fill(Question, 'HelpCircle');
export const Key = fill(PhKey, 'Key');
export const MapPin = fill(PhMapPin, 'MapPin');
export const Navigation = fill(NavigationArrow, 'Navigation');
export const Radio = fill(Broadcast, 'Radio');
export const Settings = fill(Gear, 'Settings');
export const Shield = fill(PhShield, 'Shield');
export const Sliders = fill(SlidersHorizontal, 'Sliders');
export const XCircle = fill(PhXCircle, 'XCircle');
