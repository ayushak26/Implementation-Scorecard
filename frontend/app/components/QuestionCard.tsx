// app/components/QuestionCard.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

type Question = {
  id: string;
  sdg_number: number;
  sdg_description: string;
  sdg_target: string;
  sustainability_dimension: string;
  kpi: string;
  question: string;
  sector: string;
  recommendations?: {
    awareness?: { text?: string; source?: string };
    developing?: { text?: string; source?: string };
    leading?: { text?: string; source?: string };
  };
};

type Props = {
  questions: Question[];
  selectedScores: Record<string, number | undefined>;
  onScoreSelect: (compositeKey: string, score: number) => void;
  scoreRubric?: Record<number, string>;
};

const DEFAULT_RUBRIC: Record<number, string> = {
  0: "N/A",
  1: "Issue identified, but no plans for further actions",
  2: "Issue identified, starts planning further actions",
  3: "Action plan with clear targets and deadlines in place",
  4: "Action plan operational - some progress in established targets",
  5: "Action plan operational - achieving the target set",
};

// Combined Glossary Terms from all sectors (Textiles, Fertilizers, Packaging)
const GLOSSARY_TOOLTIPS: Record<string, string> = {
  // === COMMON TERMS (used across multiple sectors) ===
  "Local": "The geographic area in which the company's activities have a direct economic, social or environmental impact.",
  "Upcycling": "The process of transforming waste materials or unwanted products into new items of higher quality, value, or functionality.",
  "Climate resilience measures": "Practices implemented to reduce vulnerability and increase the ability of workers and operations to adapt to climate-related risks, such as heatwaves, extreme weather events or changing environmental conditions.",
  "Financial literacy": "The ability of individuals to understand and use basic financial skills, including budgeting, saving, borrowing, and managing debt, to make informed financial decisions.",
  "Savings schemes": "Organized programs that help individuals regularly set aside money for future needs or emergencies.",
  "Organic waste": "Biodegradable materials of biological origin, including agricultural residues, food processing by-products and organic waste streams.",
  "Circular business models": "Business approaches that generate value by reusing products and materials, such as rental, repair, resale, or take-back systems.",
  "Underrepresented or marginalized groups": "Groups of workers that face structural barriers to equal participation or advancement in the workforce, which may include women, migrants, young workers, older workers, people with disabilities or other context-specific groups.",
  "Recyclers": "Organizations that process waste into reusable materials.",
  "Recycling": "Processing waste into new materials.",
  "Eco-design": "Designing products to reduce environmental impacts.",
  "Sustainable land-use practices": "Ways of using land that protect ecosystems long term.",
  "Biodiversity protection": "Actions to preserve plant and animal species.",
  "Fair and decent wages": "Pay that respects workers' rights and basic living needs.",
  "Stakeholders": "People or groups affected by an activity.",
  
  // === TEXTILES SECTOR ===
  "Climate-related occupational risks": "Health and safety risks faced by workers due to extreme heat, flooding, storms, or worsening air quality, that can affect their well-being and ability to work safely.",
  "Agricultural by-products": "Materials left over from farming or crop processing (such as stalks, husks, or residues) that can be reused as raw materials instead of being wasted.",
  "Expanded sourcing practices": "Broader approaches to obtaining raw materials or inputs that go beyond traditional suppliers, such as sourcing from new regions, small-scale producers, certified sustainable sources, or recycled and bio-based materials.",
  "Regenerative agriculture": "Farming practices that aim to restore soil health, improve biodiversity, and enhance ecosystem services while producing agricultural products.",
  "Phased out": "Progressively eliminated from use over time, either fully or across specific products or processes.",
  "Hazardous chemicals": "Substances that are classified as hazardous or of concern due to their health or environmental impacts, including those regulated or restricted under applicable chemical legislation.",
  "Occupational health services": "Preventive and protective measures or services aimed at safeguarding workers' physical and mental health, such as health monitoring, risk prevention, ergonomic measures or access to occupational health professionals.",
  "Circular initiatives": "Activities, projects or processes aimed at improving circularity, such as reuse, recycling, resource efficiency or circular business models.",
  "Paid family leave": "Paid time off from work related to childbirth, childcare or family care responsibilities, beyond minimum legal requirements where applicable.",
  "Closed-loop dyeing": "A textile dyeing process where water and chemicals are recovered, treated, and reused instead of being discharged as waste.",
  "Water-use efficiency": "Using less water to achieve the same level of production or output, often through improved technologies or processes.",
  "Recover and reuse energy": "Capturing and reusing energy that would otherwise be lost during production processes, such as waste heat or excess energy.",
  "Baseline year": "A reference year against which changes or improvements in energy performance are measured.",
  "Renewable sources": "Energy sources that are naturally replenished, such as solar, wind, hydro, geothermal or sustainably sourced biomass.",
  "Renewable share": "The proportion of total energy consumption that comes from renewable sources.",
  "Engagement programs": "Activities designed to involve employees in energy management, such as awareness campaigns, workshops or incentive schemes.",
  "Sustainable textile products": "Textile products designed or produced to reduce environmental and social impacts across their lifecycle.",
  "Apprenticeships": "Structured work-based learning programmes combining employment with formal training.",
  "Circular design principles": "Design approaches that aim to reduce waste by ensuring products are durable, repairable, reusable, and recyclable from the outset.",
  "Low-impact machinery": "Equipment designed or selected to reduce energy use, emissions, water consumption or other environmental impacts compared to conventional alternatives.",
  "Workplace sustainability initiatives": "Organisational actions aimed at improving environmental, social, circular, or governance performance within the workplace, such as energy-saving programs, inclusion actions, training, or employee-led initiatives.",
  "Local urban stakeholders": "Public or private actors operating within the company's urban area of influence, such as municipalities, local SMEs, NGOs, or community organisations.",
  "Local air emissions": "Air pollutants released from production activities that affect air quality in the surrounding area, such as particulate matter, volatile organic compounds, or other process-related emissions.",
  "Recycled materials (pre- and post-consumer)": "Materials recovered from manufacturing waste (pre-consumer) or from products after consumer use (post-consumer) and reintroduced into new products.",
  "Recycled materials": "Materials recovered from manufacturing waste (pre-consumer) or from products after consumer use (post-consumer) and reintroduced into new products.",
  "Sustainability performance indicators": "Metrics used to monitor environmental, social, economic, or circular performance, such as resource savings, emissions reductions, or efficiency gains.",
  "Responsible consumption practices": "Behaviours that reduce negative environmental and social impacts across the product lifecycle, such as reuse, care, repair, and informed purchasing.",
  "Greenhouse gas emissions": "Emissions of gases such as carbon dioxide (CO₂), methane (CH₄), or nitrous oxide (N₂O) that contribute to climate change.",
  "Baseline product or year": "A reference product or time period used as a starting point for comparing changes in emissions over time.",
  "Climate-related risks and opportunities": "Potential negative impacts (e.g. extreme weather, regulatory changes) and positive opportunities (e.g. efficiency gains, new markets) arising from climate change.",
  "Mitigation initiatives": "Actions aimed at reducing greenhouse gas emissions or enhancing carbon reduction efforts.",
  "Microfiber capture": "Technologies or processes designed to prevent the release of microfibers from textiles into wastewater during production or use.",
  "Textile-derived marine pollution": "Pollution originating from textile materials or processes that reaches marine environments, including microfibers and chemical residues.",
  "Virgin land-based resources": "Raw materials extracted directly from natural ecosystems, such as crops, timber, or other primary biological resources not previously used.",
  "Land-use pressure": "The demand placed on land for resource extraction, agriculture, or production that may contribute to habitat loss, degradation, or competition with other land uses.",
  "Sustainable land-use criteria": "Requirements or principles applied to sourcing decisions to ensure land is managed in a way that maintains ecological functions and long-term productivity.",
  "Sustainable land management": "Land-use practices that balance environmental protection, economic viability, and social needs over time.",
  "Traceability": "The ability to track the origin and movement of materials through the supply chain.",
  "Tiers": "Different levels of the supply chain, such as direct suppliers (Tier 1) and upstream suppliers further removed from the company.",
  "Environmental management system": "A structured framework that helps organizations manage, monitor, and improve their environmental performance.",
  "Anti-corruption measures": "Policies, controls, or practices designed to prevent bribery, fraud, or unethical conduct in business operations.",
  "Circular design and sourcing practices": "Approaches to product design and material sourcing that prioritise reuse, recyclability, durability, and reduced resource use.",
  "Sustainable textile initiatives": "Projects or actions aimed at improving environmental, social, or circular performance in textile production.",
  "Collective capacity": "The combined ability of multiple organisations or actors to achieve shared goals through cooperation.",
  
  // === FERTILIZERS SECTOR ===
  "Recovered nutrients": "Nutrients captured from waste streams for reuse.",
  "Raw inputs": "Basic materials used to make products.",
  "Crop diversity": "Growing different types of crops instead of relying on one.",
  "Conserve genetic resources": "Protect the variety of plant and animal genes.",
  "Sales channels": "Ways products reach customers (e.g. wholesalers, retailers).",
  "Market access": "Ability to sell products in local or global markets.",
  "Smallholder farmers": "Farmers working on small plots of land, often family-run.",
  "Bio-based fertiliser products": "Fertilisers made from biological or organic materials.",
  "Secondary or recovered bio-materials": "Biological materials reused after initial use.",
  "Safety baselines": "Minimum health and safety requirements.",
  "Nutrient recovery practices": "Methods to extract nutrients from waste.",
  "Resource-efficient processes": "Ways of using fewer resources to produce the same output.",
  "Supplied for external industrial reuse": "Materials provided to other industries for reuse.",
  "Close resource loops": "Reuse materials so they stay in circulation.",
  "Energy-efficient technologies or processes": "Methods, systems, or devices designed to perform the same task while consuming less energy than conventional alternatives.",
  "Recovered nutrients in fertilizer production": "Using extracted nutrients to make fertilisers.",
  "Controlled-release fertilizers": "Fertilisers that release nutrients slowly over time.",
  "Nitrogen-efficient processes": "Methods that reduce nitrogen loss or waste.",
  "Alternative feedstocks": "Raw materials—distinct from traditional fossil fuels—used in industrial processes to produce energy, chemicals, and materials.",
  "Gender pay gaps": "Differences in pay between men and women.",
  "Industrial symbiosis": "Companies sharing resources, energy, or by-products.",
  "Resource sharing initiatives": "Cooperative use of materials or infrastructure.",
  "Environmental performance": "How well activities limit environmental harm.",
  "Competitiveness of sustainable fertilizer technologies": "Ability of greener fertilisers to compete in markets.",
  "Bio-based fertilizers": "Fertilisers derived from natural biological sources.",
  "Inclusive circular value chains": "Circular systems that benefit all participants fairly.",
  "Inclusion": "Ensuring everyone can participate equally.",
  "Cultural diversity": "Presence of different cultures within a group or organization.",
  "Fertilizer distribution system": "How fertilisers are transported and sold.",
  "Circular economy practices": "Actions that reduce waste through reuse and recycling.",
  "Closed-loop systems": "A system where resources are reused continuously within the same process after being treated, instead of being thrown away.",
  "Nutrient recovery": "Capturing nutrients for reuse instead of disposal.",
  "By-product valorization": "Turning waste materials into valuable products.",
  "Resource efficiency": "Getting more value from fewer resources.",
  "Operational costs": "Day-to-day expenses of running operations.",
  "Monitoring system": "Tools to track performance or impacts.",
  "Nutrient recovery performance": "The efficiency, economic viability, and environmental impact of extracting valuable nutrients from waste streams.",
  "Eutrophication": "Water pollution caused by excess nutrients.",
  "Mitigate": "Reduce or limit negative impacts.",
  "Portfolio": "A collection of products, projects, or investments.",
  "Bio-based slow-release fertilizers": "Natural fertilisers that release nutrients gradually.",
  "Market share": "Portion of total sales held by a company or product.",
  "Valorisation": "Increasing the value of materials or waste.",
  "GHG emissions": "Greenhouse gases released into the atmosphere.",
  "Direct and indirect GHG emissions": "Emissions from own activities and supply chains.",
  "Low-carbon transport": "Transport methods with lower emissions.",
  "Renewable energy": "Energy from sources that naturally replenish.",
  "Climate-related risks": "Risks from climate impacts on operations or people.",
  "Adaptation": "Focuses on adjusting to the unavoidable impacts (e.g., building sea walls).",
  "Circular resource practices": "Keeping resources in use for longer.",
  "Reuse": "Using items again without major processing.",
  "Marine ecosystems": "Ocean and coastal environments.",
  "Eco-innovations": "New solutions that reduce environmental harm.",
  "Market competitiveness": "Ability to compete successfully in markets.",
  "Scientific cooperation": "Collaboration between research institutions.",
  "Ocean health": "Condition of marine ecosystems.",
  "Manure": "Animal waste used as fertiliser.",
  "Digestate": "Nutrient-rich material left after biogas production.",
  "Nutrient-loop systems": "Systems that recycle nutrients continuously.",
  "Virgin raw materials": "Newly extracted, unused natural resources.",
  "Land ecosystems": "Terrestrial natural environments.",
  "Biodiversity conservation": "Protecting species and ecosystems.",
  "Soil restoration": "Improving degraded soil health.",
  "Value chain": "All steps from raw materials to final product.",
  "Integrated soil management": "Coordinated practices to maintain soil health.",
  "Ecosystem protection principles": "Guidelines to safeguard natural systems.",
  "Secondary or recycled materials": "Materials reused after initial use.",
  "Sourcing": "Identifying where materials come from.",
  "Procurement": "Purchasing goods and services.",
  "Subsidy allocation": "Distribution of public financial support.",
  "Financial support schemes": "Programs providing funding or incentives.",
  "Financial stability": "Ability to meet financial obligations over time.",
  "Domestic economy": "Economic activity within a country.",
  "Active, outcome-oriented partnerships": "Collaborations focused on concrete results.",
  "living wage standards": "A wage level sufficient to cover the basic living costs of a worker and their family.",
  "Microfinance opportunities": "Access to small-scale financial services, such as microloans, savings schemes or credit facilities.",
  
  // === PACKAGING SECTOR ===
  "Reusable or recyclable packaging": "Packaging designed to be used again or processed into new materials.",
  "Occupational health and safety procedures": "Rules and actions to protect workers' health and safety at work.",
  "Inclusive recruitment practices": "Hiring approaches that ensure equal opportunity for all candidates.",
  "Economically disadvantaged backgrounds": "Social or economic conditions with limited income or resources.",
  "Financial security": "Having stable income and the ability to meet basic financial needs.",
  "Renewable and secondary bio-based raw materials": "Natural materials that regenerate or are reused from previous processes.",
  "Agricultural residues": "Materials left over after harvesting crops.",
  "Forestry by-products": "Leftover materials from forest management or wood processing.",
  "Sustainable material cycles": "Systems that reuse materials to reduce waste and resource use.",
  "Biodiversity-friendly sources": "Materials sourced in ways that protect ecosystems.",
  "Small-scale or cooperative producers": "Small businesses or farmer groups working collectively.",
  "Bio-feedstock materials": "Biological raw materials used to make products or energy.",
  "Reused or recycled materials": "Materials used again after initial use.",
  "PFAS": "Per- and polyfluoroalkyl substances.",
  "Long-term productivity strategy": "A plan to maintain or improve output over time.",
  "Circular packaging practices": "Packaging approaches focused on reuse and recycling.",
  "Operating reuse/return systems": "Systems allowing customers to return packaging for reuse.",
  "Employee onboarding": "Process of integrating new employees into a workplace.",
  "Employee upskilling": "Training employees to improve their skills.",
  "LCA (Life Cycle Assessment)": "Method to measure environmental impacts across a product's life.",
  "Digital/automation skills": "Skills related to digital tools and automated systems.",
  "Marginalised or underrepresented employees": "Workers facing barriers due to social or economic factors.",
  "Recyclability": "Ability of a product to be recycled.",
  "Material recovery": "Extracting usable materials from waste.",
  "Sustainability innovation": "New solutions that reduce environmental or social impacts.",
  "Confidential reporting": "Safe systems for reporting concerns privately.",
  "Follow-up mechanisms": "Processes to ensure reported issues are addressed.",
  "Closed-loop": "A system where resources are reused continuously within the same process after being treated.",
  "Water-recycling systems": "Technologies and processes that treat wastewater for reuse.",
  "Water-efficiency": "Using less water to achieve the same result.",
  "Cost-optimization": "Reducing costs while maintaining performance.",
  "Waste heat": "Excess heat generated during processes.",
  "Refillable": "Designed to be filled again after use.",
  "Take-back systems": "Systems where used products or packaging are returned.",
  "Value streams": "Flows of materials or value through production.",
  "Digital process optimization": "Using digital tools to improve efficiency.",
  "Refill systems": "Systems allowing product refills instead of replacement.",
  "Circular packaging loops": "Packaging systems designed for repeated reuse or recycling.",
  "Predictive maintenance": "Using data to prevent equipment failures.",
  "Environmental performance and resilience": "Ability to reduce impacts and adapt to disruptions.",
  "SMEs": "Small and medium-sized enterprises.",
  "Small or underrepresented suppliers": "Suppliers with limited market access or size.",
  "Social enterprises": "Businesses that prioritize social or environmental goals.",
  "Circular packaging systems": "Packaging designed for reuse, recycling, or return.",
  "Transparent salary bands": "Clear pay ranges for roles.",
  "Performance-based incentives": "Rewards linked to performance outcomes.",
  "Inclusion and belonging": "Creating workplaces where everyone feels valued.",
  "Urban packaging take-back, refill, or reuse systems": "City-based systems for returning or refilling packaging.",
  "Economic partnerships": "Collaborative business relationships.",
  "Micro-enterprises": "A business operating on a very small scale, especially one supported by microcredit.",
  "Circular value chains": "Supply chains that reuse materials.",
  "Employee urban-mobility": "Ways employees travel in cities for work.",
  "Reused": "Using an item again for its original purpose or a new purpose without altering its physical form.",
  "Recycled": "Breaking down waste materials into raw materials to create new products.",
  "Circular system": "An economic model that eliminates waste by keeping products and materials in use through repair, reuse, refurbishment, and recycling.",
  "Packaging lifecycle": "All stages of packaging from creation to disposal.",
  "Waste savings": "Reduced waste-related costs.",
  "Communication and awareness initiatives": "Activities to inform and educate stakeholders.",
  "Adaptations": "Adjustments to manage changes or risks.",
  "Climate-related disruptions": "Interruptions caused by climate impacts.",
  "Greenhouse-gas emission": "Gases released into the atmosphere that contribute to climate change by trapping heat.",
  "Verifiable emission-reduction": "Emission cuts that can be measured and confirmed.",
  "Neutrality targets": "Goals to balance emissions with reductions or removals.",
  "Financial or strategic planning": "Planning for long-term financial or business goals.",
  "Climate-mitigation and adaptation actions": "Actions to reduce emissions and manage climate impacts.",
  "Acidifying emissions": "Emissions that increase environmental acidity.",
  "Effluents": "Liquid waste discharged into water bodies.",
  "Downstream water": "Water affected after discharge.",
  "Spill prevention": "Measures to avoid accidental releases.",
  "Incident response": "Actions taken after an accident or spill.",
  "Virgin land-sourced biomass": "Newly harvested biological material.",
  "Recycled/secondary bio-based inputs": "Reused biological materials.",
  "Bio-based feedstocks": "Biological materials used as raw inputs.",
  "Deforestation": "Clearing forests for other land uses.",
  "Habitat conversion": "Changing natural habitats to other uses.",
  "Soil degradation": "Decline in soil quality.",
  "Financial or operational risks": "Risks affecting finances or operations.",
  "Land degradation and biodiversity loss": "Damage to land and ecosystems.",
  "Land-use impacts": "Environmental effects of land use.",
  "Transparent traceability": "Clear tracking of material origins.",
  "Circular design": "Designing products for reuse and recycling.",
  "Recyclability information": "Information on how products can be recycled.",
  "Anti-corruption, conflict-of-interest": "A situation where personal interests could improperly influence professional duties and objective decision-making.",
  "Fair-procurement measures": "Rules and practices to ensure acquisition of goods is conducted in an open, transparent, and non-discriminatory manner.",
  "Joint investments": "Shared financial investments.",
  "Cost-sharing initiatives": "Sharing costs among partners.",
  "Peer-learning networks": "Groups that learn from shared experiences.",
  "Trade associations": "Industry member organizations.",
  "Community groups": "Local organizations representing communities.",
  "Sustainable packaging practices": "Packaging methods that reduce environmental impacts.",
};

const norm = (s: string) => (s || "").trim().toLowerCase();
const makeKey = (q: Question) => `${norm(q.sector)}|${q.sdg_number}|${norm(q.sustainability_dimension)}`;

const SDG_IMAGE_MAP: Record<number, string> = {
  1: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-01.png?resize=148%2C148&ssl=1",
  2: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-02.png?resize=148%2C148&ssl=1",
  3: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-03.png?resize=148%2C148&ssl=1",
  4: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-04.png?resize=148%2C148&ssl=1",
  5: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-05.png?resize=148%2C148&ssl=1",
  6: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-06.png?resize=148%2C148&ssl=1",
  7: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-07.png?resize=148%2C148&ssl=1",
  8: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-08.png?resize=148%2C148&ssl=1",
  9: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-09.png?resize=148%2C148&ssl=1",
  10: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-10.png?resize=148%2C148&ssl=1",
  11: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-11.png?resize=148%2C148&ssl=1",
  12: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-12.png?resize=148%2C148&ssl=1",
  13: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-13.png?resize=148%2C148&ssl=1",
  14: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-14.png?resize=148%2C148&ssl=1",
  15: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-15.png?resize=148%2C148&ssl=1",
  16: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-16.png?resize=148%2C148&ssl=1",
  17: "https://www.un.org/sustainabledevelopment/wp-content/uploads/2018/05/E_SDG-goals_icons-individual-rgb-17.png?resize=148%2C148&ssl=1",
};

const DIMENSION_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  economic: { bg: "bg-blue-50", text: "text-blue-800", badge: "bg-blue-100" },
  social: { bg: "bg-yellow-50", text: "text-yellow-800", badge: "bg-yellow-100" },
  environmental: { bg: "bg-green-50", text: "text-green-800", badge: "bg-green-100" },
  circular: { bg: "bg-orange-50", text: "text-orange-800", badge: "bg-orange-100" },
  circularity: { bg: "bg-orange-50", text: "text-orange-800", badge: "bg-orange-100" },
};

const getDimensionColor = (dimension: string) => {
  const key = dimension.toLowerCase();
  return DIMENSION_COLORS[key] || { bg: "bg-green-50", text: "text-gray-800", badge: "bg-green-100" };
};

// ---------------- Tooltip Component ----------------
const Tooltip = ({ text, children }: { text: string; children: React.ReactNode }) => {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, flip: false });
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (show && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltipHeight = 120;
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      
      const shouldFlip = spaceAbove < tooltipHeight && spaceBelow > spaceAbove;
      
      // Ensure tooltip doesn't go off-screen horizontally
      let leftPos = rect.left + rect.width / 2;
      const tooltipWidth = 280;
      if (leftPos - tooltipWidth / 2 < 10) {
        leftPos = tooltipWidth / 2 + 10;
      } else if (leftPos + tooltipWidth / 2 > window.innerWidth - 10) {
        leftPos = window.innerWidth - tooltipWidth / 2 - 10;
      }
      
      setPosition({
        top: shouldFlip ? rect.bottom + 8 : rect.top - 8,
        left: leftPos,
        flip: shouldFlip,
      });
    }
  }, [show]);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help border-b-2 border-dotted border-green-500 text-green-700 font-medium hover:text-green-800 hover:border-green-600 transition-colors"
      >
        {children}
      </span>
      
      {show && typeof window !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-[9999] px-4 py-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl max-w-[280px] pointer-events-none leading-relaxed"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              transform: position.flip ? 'translate(-50%, 0%)' : 'translate(-50%, -100%)',
            }}
          >
            {text}
            {position.flip ? (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2">
                <div className="border-[6px] border-transparent border-b-gray-900"></div>
              </div>
            ) : (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                <div className="border-[6px] border-transparent border-t-gray-900"></div>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};

// ---------------- Text with Glossary Tooltips ----------------
const TextWithGlossary = ({ text }: { text: string }) => {
  const parts: React.ReactNode[] = [];
  let remainingText = text;
  let keyCounter = 0;

  // Sort terms by length (longest first) to match longer phrases before shorter ones
  const sortedTerms = Object.keys(GLOSSARY_TOOLTIPS).sort((a, b) => b.length - a.length);

  while (remainingText.length > 0) {
    let foundMatch = false;

    for (const term of sortedTerms) {
      // Case-insensitive search
      const lowerRemaining = remainingText.toLowerCase();
      const lowerTerm = term.toLowerCase();
      const index = lowerRemaining.indexOf(lowerTerm);

      if (index !== -1) {
        // Add text before the match
        if (index > 0) {
          parts.push(
            <span key={`text-${keyCounter++}`}>
              {remainingText.substring(0, index)}
            </span>
          );
        }

        // Add the matched term with tooltip (preserve original case from text)
        const matchedText = remainingText.substring(index, index + term.length);
        parts.push(
          <Tooltip key={`tooltip-${keyCounter++}`} text={GLOSSARY_TOOLTIPS[term]}>
            {matchedText}
          </Tooltip>
        );

        // Continue with remaining text
        remainingText = remainingText.substring(index + term.length);
        foundMatch = true;
        break;
      }
    }

    if (!foundMatch) {
      // No more matches found, add remaining text
      parts.push(
        <span key={`text-${keyCounter++}`}>
          {remainingText}
        </span>
      );
      break;
    }
  }

  return <>{parts}</>;
};

export default function QuestionCard({
  questions,
  selectedScores,
  onScoreSelect,
  scoreRubric = DEFAULT_RUBRIC,
}: Props) {
  if (!questions || questions.length === 0) return null;

  const sdg = questions[0];
  const scores = [0, 1, 2, 3, 4, 5];

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-green-200 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 border-b-2 border-green-200 flex items-center gap-6">
        <div className="flex-1">
          <div className="inline-block px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full mb-2 shadow-sm">
            SDG {sdg.sdg_number}
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
            {sdg.sdg_description}
          </h3>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-green-400 opacity-20 blur-xl rounded-full"></div>
          <img
            src={SDG_IMAGE_MAP[sdg.sdg_number]}
            alt={`SDG ${sdg.sdg_number} Icon`}
            className="relative w-28 h-28 object-contain drop-shadow-lg"
            loading="lazy"
          />
        </div>
      </div>

      {/* Matrix Table */}
      <div className="p-8 overflow-x-auto">
        <div className="rounded-xl overflow-hidden shadow-md border border-green-100">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-green-700 to-emerald-700">
                <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider w-[40%] align-top">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Question
                  </div>
                </th>
                {scores.map((score) => (
                  <th key={score} className="px-3 py-4 text-center w-[10%] align-top">
                    <div className="flex flex-col items-center gap-2">
                      {/* Score number - fixed height container */}
                      <div className="h-10 flex items-center justify-center">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white text-gray-900 font-bold shadow-md text-sm">
                          {score}
                        </div>
                      </div>
                      {/* Score description below number */}
                      <div className="text-[10px] leading-tight text-white font-normal px-2 text-center max-w-[120px]">
                        {score === 0 && "Not applicable"}
                        {score === 1 && "Issue identified, no action planned"}
                        {score === 2 && "Initial planning underway"}
                        {score === 3 && "Action plan with targets defined"}
                        {score === 4 && "Action plan implemented, progress achieved"}
                        {score === 5 && "Targets achieved, leading practice"}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-green-100">
              {questions.map((q, idx) => {
                const ckey = makeKey(q);
                const selected = selectedScores[ckey];
                const groupName = `g-${ckey}`;
                const colors = getDimensionColor(q.sustainability_dimension);

                return (
                  <tr 
                    key={ckey} 
                    className={`
                      transition-all duration-200 hover:bg-green-50
                      ${idx % 2 === 0 ? "bg-white" : "bg-green-50"}
                    `}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-600 to-emerald-700 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-md">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className={`inline-block px-3 py-1 ${colors.badge} ${colors.text} text-xs font-semibold rounded-full mb-2`}>
                            {q.sustainability_dimension}
                          </div>
                          <p className="text-sm text-gray-800 leading-relaxed">
                            <TextWithGlossary text={q.question} />
                          </p>
                          <span className="text-red-500 text-lg font-bold leading-none mt-1 inline-block">
                            *
                          </span>
                        </div>
                      </div>
                    </td>
                    {scores.map((score) => {
                      const isChecked = selected === score;
                      return (
                        <td key={score} className="px-3 py-5 text-center">
                          <label className={`
                            flex items-center justify-center cursor-pointer
                            transition-all duration-200
                            ${isChecked ? 'scale-110' : 'hover:scale-105'}
                          `}>
                            <input
                              type="radio"
                              name={groupName}
                              value={score}
                              checked={isChecked}
                              onChange={(e) => onScoreSelect(ckey, Number(e.target.value))}
                              className="h-6 w-6 text-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 cursor-pointer transition-transform accent-green-600"
                              aria-label={`${q.sustainability_dimension} - Score ${score}`}
                              required
                            />
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend Footer */}
      <div className="px-8 py-5 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-200">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-sm font-bold">
            !
          </div>
          <p className="text-sm text-gray-800 font-medium">
            <span className="text-red-600 font-bold text-lg">*</span> All questions are mandatory — Please complete all fields before proceeding
          </p>
        </div>
      </div>
    </div>
  );
}