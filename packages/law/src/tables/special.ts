import type { ActCode } from "../types.js";
import type { RawRow } from "./raw.js";

/**
 * Special and local laws that show up often in district-court bail orders.
 * Anything whose maximum can't be read from the section number alone is marked
 * "detail" or "quantity", so the engine asks a lawyer instead of guessing.
 */
export const SPECIAL_ROWS: Partial<Record<ActCode, { name: string; rows: RawRow[] }>> = {
  NDPS: {
    name: "Narcotic Drugs and Psychotropic Substances Act, 1985",
    rows: [
      ["8", "Prohibition of certain operations", "modifier", "Prohibition read with the penal section (e.g. 8/20)."],
      ["15", "Punishment for contravention in relation to poppy straw", "quantity"],
      ["17", "Punishment for contravention in relation to prepared opium", "quantity"],
      ["18", "Punishment for contravention in relation to opium poppy and opium", "quantity"],
      ["20", "Punishment for contravention in relation to cannabis plant and cannabis", "quantity"],
      ["21", "Punishment for contravention in relation to manufactured drugs and preparations", "quantity"],
      ["22", "Punishment for contravention in relation to psychotropic substances", "quantity"],
      ["27", "Punishment for consumption of any narcotic drug or psychotropic substance", "1y"],
      ["29", "Punishment for abetment and criminal conspiracy", "derivative", "Punished as the offence abetted."]
    ]
  },
  ARMS: {
    name: "Arms Act, 1959",
    rows: [
      ["3", "Licence for acquisition and possession of firearms and ammunition", "modifier", "Prohibition read with s.25."],
      ["4", "Licence for acquisition and possession of arms of specified description", "modifier", "Prohibition read with s.25."],
      ["5", "Licence for manufacture, sale, etc., of arms and ammunition", "modifier", "Prohibition read with s.25."],
      ["7", "Prohibition of acquisition or possession of prohibited arms", "modifier", "Prohibition read with s.25."],
      ["25", "Punishment for certain offences", "detail", "s.25 has limbs from 2 years up to life (as amended in 2019); the subsection decides."],
      ["25(1)", "Manufacture, sale, transfer, etc. in contravention of s.5", "life"],
      ["25(1)(a)", "Manufacture, sale, transfer, etc. in contravention of s.5", "life"],
      ["25(1)(b)", "Shortening a firearm barrel or converting a firearm in contravention of s.6", "life"],
      ["25(1A)", "Acquisition or possession of prohibited arms in contravention of s.7", "14y"],
      ["25(1AA)", "Manufacture, sale or possession of prohibited arms in contravention of s.7", "life"],
      ["25(1AB)", "Snatching firearms from police or armed forces", "life"],
      ["25(1B)", "Acquisition or possession of firearm without licence in contravention of s.3", "5y"],
      ["25(1B)(a)", "Acquisition or possession of firearm without licence in contravention of s.3", "5y"],
      ["25(1B)(b)", "Possession of arms in contravention of s.4", "5y"],
      ["25(6)", "Organised crime syndicate possessing arms", "life"],
      ["25(7)", "Illicit trafficking of firearms", "life"],
      ["25(8)", "Illicit manufacture of firearms", "life"],
      ["25(9)", "Celebratory gunfire endangering life", "2y"],
      ["27", "Punishment for using arms", "detail", "s.27 ranges from 7 years to death depending on the arm."],
      ["27(1)", "Using arms in contravention of s.5", "7y"],
      ["27(2)", "Using prohibited arms in contravention of s.7", "life"],
      ["27(3)", "Using prohibited arms resulting in death", "death"]
    ]
  },
  POCSO: {
    name: "Protection of Children from Sexual Offences Act, 2012",
    rows: [
      ["3", "Penetrative sexual assault (definition)", "modifier", "Definition read with s.4."],
      ["4", "Punishment for penetrative sexual assault", "life"],
      ["5", "Aggravated penetrative sexual assault (definition)", "modifier", "Definition read with s.6."],
      ["6", "Punishment for aggravated penetrative sexual assault", "death"],
      ["7", "Sexual assault (definition)", "modifier", "Definition read with s.8."],
      ["8", "Punishment for sexual assault", "5y"],
      ["9", "Aggravated sexual assault (definition)", "modifier", "Definition read with s.10."],
      ["10", "Punishment for aggravated sexual assault", "7y"],
      ["11", "Sexual harassment (definition)", "modifier", "Definition read with s.12."],
      ["12", "Punishment for sexual harassment", "3y"],
      ["17", "Punishment for abetment", "derivative", "Punished as the offence abetted."],
      ["18", "Punishment for attempt to commit an offence", "companion", "Up to half the longest term of the offence attempted."]
    ]
  },
  SCST: {
    name: "Scheduled Castes and the Scheduled Tribes (Prevention of Atrocities) Act, 1989",
    rows: [
      ["3(1)", "Punishments for offences of atrocities", "5y"],
      ["3(1)(r)", "Intentional insult or intimidation with intent to humiliate in public view", "5y"],
      ["3(1)(s)", "Abusing by caste name in public view", "5y"],
      ["3(2)", "Punishments for offences of atrocities (aggravated)", "detail", "s.3(2) limbs range from 6 months to death."],
      ["3(2)(v)", "IPC offence punishable with 10 years or more against SC/ST member", "life"],
      ["3(2)(va)", "Scheduled IPC offence against SC/ST member", "derivative", "Punished as the IPC offence."]
    ]
  },
  DOWRY: {
    name: "Dowry Prohibition Act, 1961",
    rows: [
      ["3", "Penalty for giving or taking dowry", "detail", "Sets a minimum of 5 years and writes no maximum."],
      ["4", "Penalty for demanding dowry", "2y"]
    ]
  },
  GAMBLING: {
    name: "Public Gambling Act, 1867",
    rows: [
      ["3", "Penalty for owning or keeping, or having charge of a gaming-house", "3m"],
      ["4", "Penalty for being found in gaming-house", "1m"],
      ["13", "Gaming and setting birds and animals to fight in public streets", "1m"]
    ]
  },
  IT: {
    name: "Information Technology Act, 2000",
    rows: [
      ["66", "Computer related offences", "3y"],
      ["66A", "Sending offensive messages through communication service", "struck", "Struck down by the Supreme Court in 2015 (Shreya Singhal v. Union of India)."],
      ["66C", "Punishment for identity theft", "3y"],
      ["66D", "Punishment for cheating by personation by using computer resource", "3y"],
      ["66E", "Punishment for violation of privacy", "3y"],
      ["67", "Punishment for publishing or transmitting obscene material in electronic form", "5y"],
      ["67A", "Publishing or transmitting material containing sexually explicit act", "7y"],
      ["67B", "Publishing or transmitting material depicting children in sexually explicit act", "7y"]
    ]
  },
  EXCISE: {
    name: "State Excise Acts",
    rows: [
      ["60", "Penalty for unlawful import, export, transport, manufacture, possession, sale, etc.", "detail", "State excise terms vary by state and amendment; enter the maximum by hand."],
      ["60A", "Penalty for adulterated or spurious liquor", "detail", "State excise terms vary by state and amendment; enter the maximum by hand."],
      ["63", "Penalty for misconduct by licensee", "detail", "State excise terms vary by state and amendment; enter the maximum by hand."]
    ]
  },
  GANGSTERS: {
    name: "Uttar Pradesh Gangsters and Anti-Social Activities (Prevention) Act, 1986",
    rows: [
      ["2", "Definitions", "modifier", "Definition read with s.3."],
      ["3", "Penalty", "detail", "2 to 10 years, or up to life where the offence is against a public servant."],
      ["3(1)", "Penalty", "detail", "2 to 10 years, or up to life where the offence is against a public servant."]
    ]
  }
};

/** NDPS maximum terms by quantity class (sections 15, 17, 18, 20, 21, 22). */
export const NDPS_QUANTITY_MONTHS: Record<"small" | "intermediate" | "commercial", number> = {
  small: 12,
  intermediate: 120,
  commercial: 240
};
