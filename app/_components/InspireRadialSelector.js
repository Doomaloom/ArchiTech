"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, MenuItem } from "@spaceymonk/react-radial-menu";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const IconSpark = () => (
  <svg {...iconProps}>
    <path d="M12 2l2.6 5.8L20 9l-5.4 1.7L12 18l-2.6-7.3L4 9l5.4-1.2L12 2z" />
  </svg>
);

const IconOrbit = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="3.5" />
    <path d="M3 12c2.5-4.5 6-6.5 9-6.5s6.5 2 9 6.5c-2.5 4.5-6 6.5-9 6.5s-6.5-2-9-6.5z" />
  </svg>
);

const IconTarget = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 5v2M12 17v2M5 12h2M17 12h2" />
  </svg>
);

const IconShield = () => (
  <svg {...iconProps}>
    <path d="M12 3l7 3v6c0 5-3.4 8.7-7 10.8C8.4 20.7 5 17 5 12V6l7-3z" />
  </svg>
);

const IconBolt = () => (
  <svg {...iconProps}>
    <path d="M13 2L5 14h6l-1 8 8-12h-6l1-8z" />
  </svg>
);

const IconCompass = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="8" />
    <path d="M14.5 9.5l-2.8 1.1-1.2 3 2.8-1.1 1.2-3z" />
    <path d="M12 4.5v2.2M12 17.3v2.2" />
  </svg>
);

const IconHealth = () => (
  <svg {...iconProps}>
    <path d="M12 20s-7-4.2-7-9.5A4.5 4.5 0 0112 7a4.5 4.5 0 017 3.5C19 15.8 12 20 12 20z" />
    <path d="M10 11h4M12 9v4" />
  </svg>
);

const IconEducation = () => (
  <svg {...iconProps}>
    <path d="M3 9l9-4 9 4-9 4-9-4z" />
    <path d="M7 11.5v3.2c0 1.6 2.2 2.8 5 2.8s5-1.2 5-2.8v-3.2" />
    <path d="M20 9.5v4" />
  </svg>
);

const IconTech = () => (
  <svg {...iconProps}>
    <rect x="7" y="7" width="10" height="10" rx="1.5" />
    <path d="M10 10h4v4h-4z" />
    <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
  </svg>
);

const IconCart = () => (
  <svg {...iconProps}>
    <circle cx="9" cy="19" r="1.2" />
    <circle cx="17" cy="19" r="1.2" />
    <path d="M3 5h2l2.2 9h9.8l2-7H6.2" />
  </svg>
);

const IconFinance = () => (
  <svg {...iconProps}>
    <path d="M3 10h18" />
    <path d="M5 10v7M9 10v7M15 10v7M19 10v7" />
    <path d="M2 8l10-5 10 5" />
    <path d="M3 17h18" />
  </svg>
);

const IconTravel = () => (
  <svg {...iconProps}>
    <path d="M12 21s6-5.1 6-10a6 6 0 10-12 0c0 4.9 6 10 6 10z" />
    <circle cx="12" cy="11" r="2.2" />
  </svg>
);

const IconRealEstate = () => (
  <svg {...iconProps}>
    <path d="M4 11l8-6 8 6v9H4z" />
    <path d="M10 20v-5h4v5" />
  </svg>
);

const IconPeople = () => (
  <svg {...iconProps}>
    <path d="M8.5 11a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
    <path d="M15.5 10a2 2 0 100-4 2 2 0 000 4z" />
    <path d="M4.5 18a4 4 0 018 0" />
    <path d="M13.5 18a3 3 0 016 0" />
  </svg>
);

const IconFood = () => (
  <svg {...iconProps}>
    <path d="M7 3v5M9 3v5M11 3v5M9 8v13" />
    <path d="M15 3v18M15 3c2.2 0 3.5 1.5 3.5 3.6S17.2 10 15 10" />
  </svg>
);

const IconMedia = () => (
  <svg {...iconProps}>
    <path d="M3 10v4l8 2V8l-8 2z" />
    <path d="M11 8l7-3v14l-7-3" />
    <path d="M6.5 15.5v3.5" />
  </svg>
);

const makeOption = (id, label, icon) => ({ id, label, icon });

const DEFAULT_OPTIONS = [
  makeOption("health", "Health", <IconHealth />),
  makeOption("education", "Education", <IconEducation />),
  makeOption("tech", "Tech", <IconTech />),
  makeOption("ecommerce", "E-commerce", <IconCart />),
  makeOption("finance", "Finance", <IconFinance />),
  makeOption("nonprofit", "Nonprofit", <IconPeople />),
];

const CATEGORY_QUESTION_ID = "site-category";

const CATEGORY_OPTIONS = [
  makeOption("health", "Health", <IconHealth />),
  makeOption("education", "Education", <IconEducation />),
  makeOption("tech", "Tech", <IconTech />),
  makeOption("ecommerce", "E-commerce", <IconCart />),
  makeOption("finance", "Finance", <IconFinance />),
  makeOption("travel", "Travel", <IconTravel />),
  makeOption("real-estate", "Real Estate", <IconRealEstate />),
  makeOption("nonprofit", "Nonprofit", <IconPeople />),
  makeOption("food", "Food", <IconFood />),
  makeOption("media", "Media", <IconMedia />),
];

const CATEGORY_QUESTION_BANK = {
  health: {
    audience: [
      makeOption("patients", "Patients", <IconHealth />),
      makeOption("families", "Families", <IconPeople />),
      makeOption("clinics", "Clinics", <IconShield />),
      makeOption("caregivers", "Caregivers", <IconCompass />),
      makeOption("insurers", "Insurers", <IconFinance />),
    ],
    value: [
      makeOption("book-care-fast", "Book care quickly", <IconBolt />),
      makeOption("symptom-guidance", "Understand symptoms", <IconTarget />),
      makeOption("virtual-consult", "Start virtual consults", <IconOrbit />),
      makeOption("wellness-plan", "Create wellness plans", <IconCompass />),
      makeOption("mental-support", "Access mental support", <IconSpark />),
    ],
    section: [
      makeOption("provider-finder", "Provider finder", <IconTarget />),
      makeOption("services-grid", "Services overview", <IconHealth />),
      makeOption("trust-credentials", "Credentials and reviews", <IconShield />),
      makeOption("insurance-pricing", "Insurance and pricing", <IconFinance />),
      makeOption("care-faq", "Care FAQ", <IconCompass />),
    ],
    conversion: [
      makeOption("book-appointment", "Book appointment", <IconTarget />),
      makeOption("start-intake", "Start intake form", <IconShield />),
      makeOption("call-clinic", "Call clinic", <IconBolt />),
      makeOption("join-program", "Join wellness program", <IconSpark />),
      makeOption("download-guide", "Download care guide", <IconCompass />),
    ],
  },
  education: {
    audience: [
      makeOption("students", "Students", <IconEducation />),
      makeOption("parents", "Parents", <IconPeople />),
      makeOption("teachers", "Teachers", <IconShield />),
      makeOption("schools", "Schools", <IconCompass />),
      makeOption("career-switchers", "Career switchers", <IconBolt />),
    ],
    value: [
      makeOption("guided-learning", "Structured learning paths", <IconCompass />),
      makeOption("exam-prep", "Exam preparation", <IconTarget />),
      makeOption("tutoring", "Personal tutoring", <IconPeople />),
      makeOption("skill-certification", "Skill certification", <IconShield />),
      makeOption("quick-lessons", "Quick lesson access", <IconBolt />),
    ],
    section: [
      makeOption("course-catalog", "Course catalog", <IconEducation />),
      makeOption("curriculum-roadmap", "Curriculum roadmap", <IconCompass />),
      makeOption("instructor-profiles", "Instructor profiles", <IconPeople />),
      makeOption("student-outcomes", "Student outcomes", <IconTarget />),
      makeOption("tuition-aid", "Tuition and aid", <IconFinance />),
    ],
    conversion: [
      makeOption("enroll-now", "Enroll now", <IconTarget />),
      makeOption("book-demo-class", "Book demo class", <IconBolt />),
      makeOption("start-free-lesson", "Start free lesson", <IconSpark />),
      makeOption("request-syllabus", "Request syllabus", <IconCompass />),
      makeOption("join-waitlist", "Join waitlist", <IconShield />),
    ],
  },
  tech: {
    audience: [
      makeOption("founders", "Founders", <IconCompass />),
      makeOption("product-teams", "Product teams", <IconPeople />),
      makeOption("developers", "Developers", <IconTech />),
      makeOption("operations", "Ops teams", <IconShield />),
      makeOption("enterprise-it", "Enterprise IT", <IconFinance />),
    ],
    value: [
      makeOption("launch-faster", "Ship faster", <IconBolt />),
      makeOption("automate-workflows", "Automate workflows", <IconOrbit />),
      makeOption("improve-security", "Improve security", <IconShield />),
      makeOption("reduce-cost", "Reduce costs", <IconFinance />),
      makeOption("track-metrics", "Track key metrics", <IconTarget />),
    ],
    section: [
      makeOption("feature-showcase", "Feature highlights", <IconTech />),
      makeOption("product-demo", "Interactive demo", <IconOrbit />),
      makeOption("integrations", "Integrations", <IconCompass />),
      makeOption("api-docs", "API docs", <IconShield />),
      makeOption("case-studies", "Case studies", <IconTarget />),
    ],
    conversion: [
      makeOption("start-trial", "Start free trial", <IconTarget />),
      makeOption("request-demo", "Request demo", <IconBolt />),
      makeOption("contact-sales", "Contact sales", <IconPeople />),
      makeOption("create-workspace", "Create workspace", <IconOrbit />),
      makeOption("view-docs", "View developer docs", <IconShield />),
    ],
  },
  ecommerce: {
    audience: [
      makeOption("new-shoppers", "First-time shoppers", <IconCart />),
      makeOption("repeat-customers", "Returning customers", <IconPeople />),
      makeOption("deal-hunters", "Deal hunters", <IconBolt />),
      makeOption("b2b-buyers", "B2B buyers", <IconFinance />),
      makeOption("gift-buyers", "Gift buyers", <IconSpark />),
    ],
    value: [
      makeOption("discover-products", "Discover products", <IconCompass />),
      makeOption("compare-options", "Compare options", <IconTarget />),
      makeOption("fast-checkout", "Checkout quickly", <IconBolt />),
      makeOption("delivery-tracking", "Track deliveries", <IconShield />),
      makeOption("personalized-recs", "Get recommendations", <IconSpark />),
    ],
    section: [
      makeOption("category-grid", "Category grid", <IconCart />),
      makeOption("featured-collections", "Featured collections", <IconSpark />),
      makeOption("top-reviews", "Top reviews", <IconShield />),
      makeOption("bundles-offers", "Bundles and offers", <IconBolt />),
      makeOption("shipping-policy", "Shipping and returns", <IconCompass />),
    ],
    conversion: [
      makeOption("add-to-cart", "Add to cart", <IconCart />),
      makeOption("start-checkout", "Start checkout", <IconTarget />),
      makeOption("save-wishlist", "Save to wishlist", <IconSpark />),
      makeOption("join-loyalty", "Join loyalty program", <IconPeople />),
      makeOption("restock-alert", "Subscribe to restock alerts", <IconShield />),
    ],
  },
  finance: {
    audience: [
      makeOption("consumers", "Everyday consumers", <IconPeople />),
      makeOption("smb-owners", "Small business owners", <IconCompass />),
      makeOption("investors", "Investors", <IconTarget />),
      makeOption("advisors", "Financial advisors", <IconShield />),
      makeOption("accountants", "Accountants", <IconFinance />),
    ],
    value: [
      makeOption("manage-budget", "Manage budgets", <IconTarget />),
      makeOption("compare-products", "Compare financial products", <IconCompass />),
      makeOption("grow-portfolio", "Grow portfolio", <IconBolt />),
      makeOption("improve-cashflow", "Improve cashflow", <IconOrbit />),
      makeOption("plan-taxes", "Plan taxes", <IconShield />),
    ],
    section: [
      makeOption("calculators", "Calculators", <IconTarget />),
      makeOption("plan-comparison", "Plan comparison", <IconCompass />),
      makeOption("compliance-trust", "Compliance and trust", <IconShield />),
      makeOption("market-insights", "Market insights", <IconBolt />),
      makeOption("pricing-tiers", "Pricing tiers", <IconFinance />),
    ],
    conversion: [
      makeOption("create-account", "Create account", <IconTarget />),
      makeOption("apply-now", "Apply now", <IconBolt />),
      makeOption("schedule-advisor", "Schedule advisor call", <IconPeople />),
      makeOption("download-report", "Download report", <IconCompass />),
      makeOption("subscribe-brief", "Subscribe to market brief", <IconShield />),
    ],
  },
  travel: {
    audience: [
      makeOption("vacationers", "Vacationers", <IconTravel />),
      makeOption("business-travelers", "Business travelers", <IconFinance />),
      makeOption("families", "Families", <IconPeople />),
      makeOption("digital-nomads", "Digital nomads", <IconTech />),
      makeOption("local-explorers", "Local explorers", <IconCompass />),
    ],
    value: [
      makeOption("plan-itinerary", "Plan itinerary", <IconCompass />),
      makeOption("find-deals", "Find travel deals", <IconBolt />),
      makeOption("compare-stays", "Compare stays", <IconTarget />),
      makeOption("discover-activities", "Discover activities", <IconSpark />),
      makeOption("simple-booking", "Book quickly", <IconTravel />),
    ],
    section: [
      makeOption("destination-guides", "Destination guides", <IconCompass />),
      makeOption("package-deals", "Package deals", <IconBolt />),
      makeOption("map-planner", "Map planner", <IconTravel />),
      makeOption("traveler-reviews", "Traveler reviews", <IconShield />),
      makeOption("seasonal-highlights", "Seasonal highlights", <IconSpark />),
    ],
    conversion: [
      makeOption("book-trip", "Book trip", <IconTarget />),
      makeOption("build-itinerary", "Build itinerary", <IconCompass />),
      makeOption("request-quote", "Request quote", <IconFinance />),
      makeOption("save-plan", "Save trip plan", <IconSpark />),
      makeOption("join-alerts", "Join travel alerts", <IconShield />),
    ],
  },
  "real-estate": {
    audience: [
      makeOption("home-buyers", "Home buyers", <IconRealEstate />),
      makeOption("renters", "Renters", <IconPeople />),
      makeOption("sellers", "Sellers", <IconTarget />),
      makeOption("agents", "Agents", <IconCompass />),
      makeOption("investors", "Investors", <IconFinance />),
    ],
    value: [
      makeOption("browse-listings", "Browse listings", <IconRealEstate />),
      makeOption("compare-neighborhoods", "Compare neighborhoods", <IconCompass />),
      makeOption("book-tour", "Book tours", <IconBolt />),
      makeOption("estimate-value", "Estimate property value", <IconTarget />),
      makeOption("mortgage-prequal", "Start mortgage pre-qual", <IconShield />),
    ],
    section: [
      makeOption("featured-listings", "Featured listings", <IconRealEstate />),
      makeOption("map-search", "Map search", <IconTravel />),
      makeOption("affordability-tool", "Affordability calculator", <IconFinance />),
      makeOption("agent-profiles", "Agent profiles", <IconPeople />),
      makeOption("market-trends", "Market trends", <IconCompass />),
    ],
    conversion: [
      makeOption("book-viewing", "Book viewing", <IconTarget />),
      makeOption("contact-agent", "Contact agent", <IconPeople />),
      makeOption("request-valuation", "Request valuation", <IconFinance />),
      makeOption("save-listing", "Save listing", <IconSpark />),
      makeOption("start-prequal", "Start pre-qualification", <IconShield />),
    ],
  },
  nonprofit: {
    audience: [
      makeOption("donors", "Donors", <IconFinance />),
      makeOption("volunteers", "Volunteers", <IconPeople />),
      makeOption("beneficiaries", "Beneficiaries", <IconShield />),
      makeOption("partners", "Partners", <IconCompass />),
      makeOption("advocates", "Advocates", <IconSpark />),
    ],
    value: [
      makeOption("understand-mission", "Understand mission", <IconCompass />),
      makeOption("track-impact", "See impact metrics", <IconTarget />),
      makeOption("find-programs", "Find programs", <IconShield />),
      makeOption("join-campaigns", "Join campaigns", <IconSpark />),
      makeOption("support-fundraising", "Support fundraising", <IconBolt />),
    ],
    section: [
      makeOption("mission-story", "Mission story", <IconCompass />),
      makeOption("impact-metrics", "Impact metrics", <IconTarget />),
      makeOption("active-campaigns", "Active campaigns", <IconSpark />),
      makeOption("volunteer-hub", "Volunteer hub", <IconPeople />),
      makeOption("annual-reports", "Annual reports", <IconShield />),
    ],
    conversion: [
      makeOption("donate-now", "Donate now", <IconTarget />),
      makeOption("volunteer-signup", "Volunteer signup", <IconPeople />),
      makeOption("register-event", "Register for event", <IconBolt />),
      makeOption("join-newsletter", "Join newsletter", <IconSpark />),
      makeOption("share-campaign", "Share campaign", <IconCompass />),
    ],
  },
  food: {
    audience: [
      makeOption("dine-in", "Dine-in guests", <IconFood />),
      makeOption("delivery", "Delivery customers", <IconTravel />),
      makeOption("event-planners", "Event planners", <IconCompass />),
      makeOption("regulars", "Regular customers", <IconPeople />),
      makeOption("franchise", "Franchise prospects", <IconFinance />),
    ],
    value: [
      makeOption("browse-menu", "Browse menu quickly", <IconFood />),
      makeOption("order-fast", "Order in seconds", <IconBolt />),
      makeOption("reserve-table", "Reserve tables", <IconTarget />),
      makeOption("plan-catering", "Plan catering", <IconCompass />),
      makeOption("discover-specials", "Discover specials", <IconSpark />),
    ],
    section: [
      makeOption("signature-dishes", "Signature dishes", <IconSpark />),
      makeOption("menu-categories", "Menu categories", <IconFood />),
      makeOption("customer-reviews", "Customer reviews", <IconShield />),
      makeOption("locations-hours", "Locations and hours", <IconTravel />),
      makeOption("offers-deals", "Offers and deals", <IconBolt />),
    ],
    conversion: [
      makeOption("order-now", "Order now", <IconTarget />),
      makeOption("reserve-now", "Reserve table", <IconFood />),
      makeOption("request-catering", "Request catering quote", <IconCompass />),
      makeOption("join-loyalty", "Join loyalty", <IconPeople />),
      makeOption("get-coupon", "Get coupon", <IconSpark />),
    ],
  },
  media: {
    audience: [
      makeOption("readers", "Readers", <IconMedia />),
      makeOption("listeners", "Listeners", <IconOrbit />),
      makeOption("viewers", "Viewers", <IconSpark />),
      makeOption("creators", "Creators", <IconPeople />),
      makeOption("advertisers", "Advertisers", <IconFinance />),
    ],
    value: [
      makeOption("discover-content", "Discover new content", <IconCompass />),
      makeOption("personalized-feed", "Get personalized feed", <IconOrbit />),
      makeOption("follow-topics", "Follow topics", <IconTarget />),
      makeOption("support-creators", "Support creators", <IconSpark />),
      makeOption("join-discussion", "Join conversations", <IconPeople />),
    ],
    section: [
      makeOption("trending-feed", "Trending feed", <IconBolt />),
      makeOption("editorial-picks", "Editorial picks", <IconCompass />),
      makeOption("creator-spotlight", "Creator spotlight", <IconPeople />),
      makeOption("topic-hubs", "Topic hubs", <IconTarget />),
      makeOption("member-benefits", "Member benefits", <IconShield />),
    ],
    conversion: [
      makeOption("subscribe", "Subscribe", <IconTarget />),
      makeOption("start-free", "Start free access", <IconBolt />),
      makeOption("follow-topic", "Follow a topic", <IconCompass />),
      makeOption("join-community", "Join community", <IconPeople />),
      makeOption("contact-partnerships", "Contact partnerships", <IconFinance />),
    ],
  },
};

const QUESTION_TEMPLATES = [
  {
    id: "primary-audience",
    key: "audience",
    prompt: (label) =>
      `Who is the primary audience for this ${label.toLowerCase()} website?`,
    helper: "Pick the core users so layout and messaging stay focused.",
  },
  {
    id: "core-value",
    key: "value",
    prompt: (label) =>
      `What should visitors accomplish first on the ${label.toLowerCase()} site?`,
    helper: "Choose the fastest value moment users should experience.",
  },
  {
    id: "hero-section",
    key: "section",
    prompt: (label) =>
      `Which homepage section should lead for your ${label.toLowerCase()} idea?`,
    helper: "This determines the strongest first screen hierarchy.",
  },
  {
    id: "primary-conversion",
    key: "conversion",
    prompt: (label) =>
      `What is the main conversion goal for this ${label.toLowerCase()} website?`,
    helper: "Select the action that defines project success.",
  },
];

const buildDefaultQuestions = (categoryId = CATEGORY_OPTIONS[0]?.id || "tech") => {
  const fallbackCategoryId = CATEGORY_OPTIONS[0]?.id || "tech";
  const category =
    CATEGORY_OPTIONS.find((option) => option.id === categoryId) ||
    CATEGORY_OPTIONS.find((option) => option.id === fallbackCategoryId) ||
    CATEGORY_OPTIONS[0];
  const questionSet =
    CATEGORY_QUESTION_BANK[category.id] ||
    CATEGORY_QUESTION_BANK[fallbackCategoryId] ||
    CATEGORY_QUESTION_BANK.tech;
  return [
    {
      id: CATEGORY_QUESTION_ID,
      prompt: "What category best describes the website idea?",
      helper:
        "Pick a category first. Subquestions adapt automatically for that domain.",
      options: CATEGORY_OPTIONS,
    },
    ...QUESTION_TEMPLATES.map((template) => ({
      id: template.id,
      prompt: template.prompt(category.label),
      helper: template.helper,
      options: questionSet[template.key] || [],
    })),
  ];
};

const buildSelectionItems = (questions, selections) => {
  return questions.map((question, index) => {
    const selectedId = selections[question.id];
    const selectedOption = question.options?.find(
      (option) => option.id === selectedId
    );
    return {
      id: question.id,
      step: index + 1,
      label: selectedOption?.label || "Pending",
      isSelected: Boolean(selectedOption),
    };
  });
};

const SelectionCard = ({ item }) => {
  return (
    <div
      className={`inspire-selection-card${
        item.isSelected ? " is-selected" : " is-pending"
      }`}
      style={{ "--reveal-index": item.step }}
      data-step={item.step}
    >
      <span className="inspire-selection-step">0{item.step}</span>
      <span className="inspire-selection-label">{item.label}</span>
    </div>
  );
};

const SelectionTree = ({ items }) => {
  if (!items.length) {
    return null;
  }
  if (items.length === 1) {
    return <SelectionCard item={items[0]} />;
  }
  const [first, second, ...rest] = items;
  return (
    <div className="inspire-selection-split is-horizontal">
      <div className="inspire-selection-slot">
        <SelectionCard item={first} />
      </div>
      <div className="inspire-selection-split is-vertical">
        <div className="inspire-selection-slot">
          <SelectionCard item={second} />
        </div>
        <div className="inspire-selection-slot">
          {rest.length ? <SelectionTree items={rest} /> : null}
        </div>
      </div>
    </div>
  );
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const buildMenuMetrics = (rect) => {
  if (!rect) {
    return null;
  }
  const minSide = Math.min(rect.width, rect.height);
  if (!minSide) {
    return null;
  }
  const outerPadding = clamp(Math.floor(minSide * 0.02), 4, 12);
  const outerRadius = Math.max(50, Math.floor(minSide / 2 - outerPadding));
  const ringThickness = clamp(Math.floor(minSide * 0.13), 64, 84);
  const innerRadius = Math.max(36, outerRadius - ringThickness);
  if (innerRadius >= outerRadius) {
    return null;
  }
  return {
    centerX: rect.width / 2,
    centerY: rect.height / 2,
    innerRadius,
    outerRadius,
  };
};

export default function InspireRadialSelector({
  question,
  options = DEFAULT_OPTIONS,
  questions,
  onSelect,
  onConfirm,
  onComplete,
}) {
  const surfaceRef = useRef(null);
  const [menuMetrics, setMenuMetrics] = useState(null);
  const [selectedByQuestion, setSelectedByQuestion] = useState({});
  const selectedCategoryId =
    selectedByQuestion[CATEGORY_QUESTION_ID] || CATEGORY_OPTIONS[0]?.id || "tech";
  const categoryQuestions = useMemo(
    () => buildDefaultQuestions(selectedCategoryId),
    [selectedCategoryId]
  );
  const resolvedQuestions = useMemo(() => {
    if (questions?.length) {
      return questions;
    }
    if (question) {
      return [
        {
          id: "prompt",
          prompt: question,
          helper: "Choose the focus that feels right.",
          options: options?.length >= 2 ? options : DEFAULT_OPTIONS,
        },
      ];
    }
    return categoryQuestions;
  }, [categoryQuestions, question, options, questions]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isCompletionArmed, setIsCompletionArmed] = useState(false);
  useEffect(() => {
    if (questionIndex < resolvedQuestions.length) {
      return;
    }
    setQuestionIndex(0);
  }, [questionIndex, resolvedQuestions.length]);
  const currentQuestion = resolvedQuestions[questionIndex] || resolvedQuestions[0];
  const currentOptions = useMemo(() => {
    if (currentQuestion?.options?.length >= 2) {
      return currentQuestion.options;
    }
    return options?.length >= 2 ? options : DEFAULT_OPTIONS;
  }, [currentQuestion, options]);
  const selectionItems = useMemo(() => {
    if (!resolvedQuestions.length) {
      return [];
    }
    return buildSelectionItems(resolvedQuestions, selectedByQuestion);
  }, [resolvedQuestions, selectedByQuestion]);
  const allQuestionsAnswered = useMemo(() => {
    if (!resolvedQuestions.length) {
      return false;
    }
    return resolvedQuestions.every((entry) => Boolean(selectedByQuestion[entry.id]));
  }, [resolvedQuestions, selectedByQuestion]);
  const isLastQuestion = useMemo(() => {
    return questionIndex >= Math.max(0, resolvedQuestions.length - 1);
  }, [questionIndex, resolvedQuestions.length]);
  const isCurrentQuestionAnswered = useMemo(() => {
    if (!currentQuestion?.id) {
      return false;
    }
    return Boolean(selectedByQuestion[currentQuestion.id]);
  }, [currentQuestion, selectedByQuestion]);
  const showCompleteAction = allQuestionsAnswered;
  const hideRingOptionText = isLastQuestion && isCurrentQuestionAnswered;

  useEffect(() => {
    if (!allQuestionsAnswered && isCompletionArmed) {
      setIsCompletionArmed(false);
    }
  }, [allQuestionsAnswered, isCompletionArmed]);
  const visibleSelectionItems = useMemo(() => {
    return selectionItems.filter((item) => item.isSelected);
  }, [selectionItems]);
  const [activeId, setActiveId] = useState(() => currentOptions[0]?.id ?? null);
  const activeOption = useMemo(() => {
    return (
      currentOptions.find((option) => option.id === activeId) ||
      currentOptions[0] ||
      null
    );
  }, [activeId, currentOptions]);

  useEffect(() => {
    if (!currentQuestion) {
      return;
    }
    const storedSelection = selectedByQuestion[currentQuestion.id];
    const nextId =
      currentOptions.find((option) => option.id === storedSelection)?.id ||
      currentOptions[0]?.id ||
      null;
    setActiveId(nextId);
  }, [currentQuestion, currentOptions, selectedByQuestion]);

  useEffect(() => {
    const element = surfaceRef.current;
    if (!element) {
      return;
    }
    const update = () => {
      const rect = element.getBoundingClientRect();
      const metrics = buildMenuMetrics(rect);
      if (metrics) {
        setMenuMetrics(metrics);
      }
    };
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const centerStyle = useMemo(() => {
    if (!menuMetrics) {
      return undefined;
    }
    const diameter = menuMetrics.innerRadius * 2;
    const maxWidth = clamp(Math.floor(diameter * 0.7), 160, 360);
    return { maxWidth };
  }, [menuMetrics]);

  const handleSelect = (option, index) => {
    setActiveId(option.id);
    onSelect?.(option, index, currentQuestion);
  };

  const handleConfirm = () => {
    if (!activeOption || !currentQuestion) {
      return;
    }
    const isCategoryQuestion = currentQuestion.id === CATEGORY_QUESTION_ID;
    const nextSelections = isCategoryQuestion
      ? { [CATEGORY_QUESTION_ID]: activeOption.id }
      : {
          ...selectedByQuestion,
          [currentQuestion.id]: activeOption.id,
        };
    setSelectedByQuestion(nextSelections);
    const nextQuestions = questions?.length
      ? questions
      : question
      ? [
          {
            id: "prompt",
            prompt: question,
            helper: "Choose the focus that feels right.",
            options: options?.length >= 2 ? options : DEFAULT_OPTIONS,
          },
        ]
      : buildDefaultQuestions(
          nextSelections?.[CATEGORY_QUESTION_ID] ||
            selectedCategoryId ||
            CATEGORY_OPTIONS[0]?.id
        );
    onConfirm?.(activeOption, currentQuestion, nextSelections, nextQuestions);
    const isFullyAnswered = nextQuestions.every((entry) =>
      Boolean(nextSelections?.[entry.id])
    );
    if (isFullyAnswered) {
      if (!isCompletionArmed) {
        setIsCompletionArmed(true);
        return;
      }
      onComplete?.(nextSelections, nextQuestions);
      return;
    }
    if (isCompletionArmed) {
      setIsCompletionArmed(false);
    }
    setQuestionIndex((current) => {
      if (nextQuestions.length <= 1) {
        return current;
      }
      if (isCategoryQuestion) {
        return 1;
      }
      return Math.min(current + 1, nextQuestions.length - 1);
    });
  };

  return (
    <div className="inspire-radial-stage">
      <div className="inspire-radial-left">
        <div className="inspire-radial-question">
          <span className="inspire-radial-kicker">
            {allQuestionsAnswered
              ? "Website brief complete"
              : `Website brief question ${Math.min(
                  questionIndex + 1,
                  resolvedQuestions.length
                )} of ${resolvedQuestions.length || 1}`}
          </span>
          <h2>{currentQuestion?.prompt || question}</h2>
          <p>
            {currentQuestion?.helper ||
              "Select one focused answer to shape the generated site concept."}
          </p>
        </div>
        {visibleSelectionItems.length ? (
          <div className="inspire-selection-panel">
            <span className="inspire-selection-kicker">Saved answers</span>
            <div className="inspire-selection-tree">
              <SelectionTree items={visibleSelectionItems} />
            </div>
          </div>
        ) : null}
      </div>
      <div className="inspire-radial-surface" ref={surfaceRef}>
        <div className="inspire-radial-center">
          <span className="inspire-radial-center-kicker">
            {showCompleteAction ? "Ready to continue" : "Selected answer"}
          </span>
          <div className="inspire-radial-center-row">
            {!showCompleteAction ? (
              <div className="inspire-radial-center-pill" style={centerStyle}>
                <strong>{activeOption?.label || "Select"}</strong>
              </div>
            ) : null}
            <button
              className={`inspire-radial-confirm${
                showCompleteAction ? " is-complete" : ""
              }`}
              type="button"
              onClick={handleConfirm}
              aria-label={
                showCompleteAction
                  ? isCompletionArmed
                    ? "Complete brief and continue"
                    : "Ready to complete brief"
                  : "Confirm answer"
              }
              disabled={!activeOption}
            >
              {showCompleteAction ? (
                <span className="inspire-radial-confirm-text">Complete</span>
              ) : null}
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4.5 10.5l3.2 3.2 7.8-7.8" />
              </svg>
            </button>
          </div>
        </div>
        {menuMetrics ? (
          <Menu
            key={currentQuestion?.id || "radial"}
            centerX={menuMetrics.centerX}
            centerY={menuMetrics.centerY}
            innerRadius={menuMetrics.innerRadius}
            outerRadius={menuMetrics.outerRadius}
            show={true}
            drawBackground
            animation={["fade", "scale"]}
            animationTimeout={180}
            className="inspire-radial-menu"
          >
            {currentOptions.map((option, index) => (
              <MenuItem
                key={option.id}
                onItemClick={() => handleSelect(option, index)}
                data={option.id}
              >
                <div
                  className="inspire-radial-item"
                  data-active={activeId === option.id}
                >
                  {!hideRingOptionText ? (
                    <span className="inspire-radial-label">{option.label}</span>
                  ) : null}
                  <span className="inspire-radial-icon">{option.icon}</span>
                </div>
              </MenuItem>
            ))}
          </Menu>
        ) : null}
      </div>
    </div>
  );
}
