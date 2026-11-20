import {
  BookOpen,
  CircleCheckBig,
  Ear,
  Eye,
  Headphones,
  Keyboard,
  Layers,
  Link2,
  ListOrdered,
  Newspaper,
  SpellCheck,
  TextCursorInput,
  type LucideIcon,
} from "lucide-react";
import type { PracticeKind } from "@/features/practice/model";

export const KIND_ICON: Record<PracticeKind, LucideIcon> = {
  flashcards: BookOpen,
  listen_choose: Ear,
  look_choose: Eye,
  match: Link2,
  spell: SpellCheck,
  true_false: CircleCheckBig,
  fill_blank: TextCursorInput,
  rearrange: ListOrdered,
  listen_type: Keyboard,
  listening: Headphones,
  reading: Newspaper,
  mixed: Layers,
};
