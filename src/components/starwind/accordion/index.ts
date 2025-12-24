// @ts-nocheck
import Accordion, { accordion } from './Accordion.astro';
import AccordionCloseButton, {
  accordionCloseButton,
} from './AccordionCloseButton.astro';
import AccordionContent, { accordionContent } from './AccordionContent.astro';
import AccordionItem, { accordionItem } from './AccordionItem.astro';
import AccordionTrigger, { accordionTrigger } from './AccordionTrigger.astro';

const AccordionVariants = {
  accordion,
  accordionCloseButton,
  accordionContent,
  accordionItem,
  accordionTrigger,
};

export {
  Accordion,
  AccordionCloseButton,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AccordionVariants,
};

export default {
  Root: Accordion,
  CloseButton: AccordionCloseButton,
  Content: AccordionContent,
  Item: AccordionItem,
  Trigger: AccordionTrigger,
};
