"""Deterministic compliance rules for Legal Metrology Packaged Commodities
rules (LM-001 through LM-010).

Architectural Rule:
- Rules MUST be pure, deterministic functions receiving structured ProductData.
- They do NOT invoke AI / LLMs.
- AI extracts raw label text & structured hints; rule engine evaluates legal
  compliance status.
"""

import re
from datetime import datetime, date, timedelta
import calendar
from typing import Optional

from ..schemas import ProductData, RuleResult, ComplianceStatus


def _get_evidence(
    product: ProductData,
    field_name: str,
    fallback: Optional[str] = None
) -> str:
    """Extract verbatim evidence snippet for a given field."""
    for item in product.raw_evidence:
        if (
            item.field
            and item.field.lower() == field_name.lower()
            and item.evidence
        ):
            return item.evidence
    return fallback if fallback else "Evidence not available."


# ============================================================
# LM-001: Rule 6(1)(a) - Manufacturer Details
# ============================================================

def check_lm_001_manufacturer(product: ProductData) -> RuleResult:
    mfg = product.manufacturer
    has_name = bool(mfg and mfg.name and mfg.name.strip())
    has_addr = bool(mfg and mfg.address and mfg.address.strip())
    has_role = bool(mfg and mfg.role and mfg.role.strip())
    evidence = _get_evidence(product, "manufacturer")

    if evidence == "Evidence not available." and mfg:
        parts = [p.strip() for p in [mfg.role, mfg.name, mfg.address] if p and p.strip()]
        if parts: evidence = ", ".join(parts)

    citation = "Legal Metrology (PC) Rules 2011 — Rule 6(1)(a)"

    if has_name and has_addr:
        detected = f"{mfg.name.strip()}, {mfg.address.strip()}"
        if has_role: detected = f"[{mfg.role.strip()}] {detected}"
        return RuleResult(
            rule_id="LM-001", rule_name="Manufacturer / Packer Details", field="manufacturer",
            status=ComplianceStatus.PASS, detected_value=detected,
            evidence=(evidence if evidence != "Evidence not available." else detected),
            reason=f"Complete manufacturer name and address identified. [{citation}]",
            recommendation=None
        )

    if has_name and not has_addr:
        detected = mfg.name.strip()
        if has_role: detected = f"[{mfg.role.strip()}] {detected}"
        return RuleResult(
            rule_id="LM-001", rule_name="Manufacturer / Packer Details", field="manufacturer",
            status=ComplianceStatus.REVIEW, detected_value=detected,
            evidence=(evidence if evidence != "Evidence not available." else detected),
            reason=f"Entity name found, but complete address is missing. [{citation}]",
            recommendation="Verify complete postal address including PIN code."
        )

    return RuleResult(
        rule_id="LM-001", rule_name="Manufacturer / Packer Details", field="manufacturer",
        status=ComplianceStatus.REVIEW, detected_value=None, evidence="Evidence not available.",
        reason=f"Manufacturer information could not be identified from image. [{citation}]",
        recommendation="Inspect small-print areas of the package."
    )


# ============================================================
# LM-002: Rule 6(1)(b) - Country of Origin
# ============================================================

def check_lm_002_country_of_origin(product: ProductData) -> RuleResult:
    country = product.country_of_origin
    evidence = _get_evidence(product, "country_of_origin")
    mfg = product.manufacturer
    mfg_role = (mfg.role or "").strip().lower() if mfg else ""
    mfg_addr = (mfg.address or "").strip().lower() if mfg else ""

    citation = "Legal Metrology (PC) Rules 2011 — Rule 6(1)(b)"

    if country and country.strip():
        return RuleResult(
            rule_id="LM-002", rule_name="Country of Origin", field="country_of_origin",
            status=ComplianceStatus.PASS, detected_value=country.strip(),
            evidence=(evidence if evidence != "Evidence not available." else f"Country of Origin: {country}"),
            reason=f"Explicit country of origin declaration identified. [{citation}]",
            recommendation=None
        )

    imported_terms = ["imported by", "importer", "imported", "imported and marketed by"]
    if any(term in mfg_role for term in imported_terms):
        return RuleResult(
            rule_id="LM-002", rule_name="Country of Origin", field="country_of_origin",
            status=ComplianceStatus.REVIEW, detected_value="Importer identified, country missing",
            evidence="Evidence not available.",
            reason=f"Imported commodity indicated, but explicit country declaration missing. [{citation}]",
            recommendation="Verify package for 'Made in [Country]' or 'Country of Origin: [Country]'."
        )

    indian_address = ("india" in mfg_addr or bool(re.search(r"\b\d{6}\b", mfg_addr)))
    domestic_role = any(term in mfg_role for term in ["manufactured by", "packed by", "made by"])

    if mfg and indian_address and domestic_role:
        return RuleResult(
            rule_id="LM-002", rule_name="Country of Origin", field="country_of_origin",
            status=ComplianceStatus.NA, detected_value="Domestic Manufacturer",
            evidence=(evidence if evidence != "Evidence not available." else "Domestic address detected"),
            reason=f"Domestic manufacturer identified; origin assessment not applicable. [{citation}]",
            recommendation=None
        )

    return RuleResult(
        rule_id="LM-002", rule_name="Country of Origin", field="country_of_origin",
        status=ComplianceStatus.REVIEW, detected_value=None, evidence="Evidence not available.",
        reason=f"Could not establish import/domestic status or explicit origin. [{citation}]",
        recommendation="Inspect package for origin declarations."
    )


# ============================================================
# LM-003: Rule 6(1)(c) - Generic Name
# ============================================================

def check_lm_003_generic_name(product: ProductData) -> RuleResult:
    gen_name = product.generic_name
    brand_name = product.brand_name
    evidence = _get_evidence(product, "generic_name")
    
    citation = "Legal Metrology (PC) Rules 2011 — Rule 6(1)(c)"

    if gen_name and gen_name.strip():
        clean_name = gen_name.strip()
        if brand_name and clean_name.lower() == brand_name.strip().lower():
            return RuleResult(
                rule_id="LM-003", rule_name="Generic Product Name", field="generic_name",
                status=ComplianceStatus.REVIEW, detected_value=clean_name,
                evidence=(evidence if evidence != "Evidence not available." else clean_name),
                reason=f"Generic name is identical to brand name. [{citation}]",
                recommendation="Ensure generic commodity name is stated separately."
            )
        return RuleResult(
            rule_id="LM-003", rule_name="Generic Product Name", field="generic_name",
            status=ComplianceStatus.PASS, detected_value=clean_name,
            evidence=(evidence if evidence != "Evidence not available." else clean_name),
            reason=f"Generic name '{clean_name}' identified. [{citation}]",
            recommendation=None
        )

    return RuleResult(
        rule_id="LM-003", rule_name="Generic Product Name", field="generic_name",
        status=ComplianceStatus.FAIL, detected_value=None, evidence="Evidence not available.",
        reason=f"Generic commodity name not detected. [{citation}]",
        recommendation="Print generic name clearly on principal display panel."
    )


# ============================================================
# LM-004: Rule 6(1)(d) - Net Quantity
# ============================================================

def check_lm_004_net_quantity(product: ProductData) -> RuleResult:
    qty = product.quantity
    val = qty.value if qty else None
    unit = qty.unit if qty else None
    evidence = _get_evidence(product, "quantity", qty.raw_text if qty else None)
    
    citation = "Legal Metrology (PC) Rules 2011 — Rule 6(1)(d)"

    if val and str(val).strip() and unit and str(unit).strip():
        detected = f"{val} {unit}".strip()
        return RuleResult(
            rule_id="LM-004", rule_name="Net Quantity", field="quantity",
            status=ComplianceStatus.PASS, detected_value=detected,
            evidence=(evidence if evidence != "Evidence not available." else detected),
            reason=f"Net quantity '{detected}' verified. [{citation}]",
            recommendation=None
        )

    return RuleResult(
        rule_id="LM-004", rule_name="Net Quantity", field="quantity",
        status=ComplianceStatus.FAIL, detected_value=None, evidence="Evidence not available.",
        reason=f"Standard net quantity declaration missing. [{citation}]",
        recommendation="Ensure standard SI unit (g, kg, ml, L) is clearly printed."
    )


# ============================================================
# LM-005: Rule 6(1)(e) - Manufacture Date
# ============================================================

def check_lm_005_mfg_packing_date(product: ProductData) -> RuleResult:
    dates = product.dates
    mfg_date = dates.manufacture_date if dates else None
    pkd_date = dates.packing_date if dates else None
    evidence = _get_evidence(product, "manufacture_date")
    
    citation = "Legal Metrology (PC) Rules 2011 — Rule 6(1)(e)"

    if mfg_date and mfg_date.strip():
        return RuleResult(
            rule_id="LM-005", rule_name="Manufacture Date", field="dates.manufacture_date",
            status=ComplianceStatus.PASS, detected_value=f"Mfg: {mfg_date.strip()}",
            evidence=(evidence if evidence != "Evidence not available." else mfg_date),
            reason=f"Manufacture date identified. [{citation}]",
            recommendation=None
        )
    if pkd_date and pkd_date.strip():
        return RuleResult(
            rule_id="LM-005", rule_name="Manufacture Date", field="dates.packing_date",
            status=ComplianceStatus.PASS, detected_value=f"Pkd: {pkd_date.strip()}",
            evidence=(evidence if evidence != "Evidence not available." else pkd_date),
            reason=f"Packing date identified. [{citation}]",
            recommendation=None
        )

    return RuleResult(
        rule_id="LM-005", rule_name="Manufacture Date", field="dates",
        status=ComplianceStatus.FAIL, detected_value=None, evidence="Evidence not available.",
        reason=f"Mandatory manufacture/packing date missing. [{citation}]",
        recommendation="Month and year of manufacture must be clearly stated."
    )


# ============================================================
# LM-006: Rule 6(1)(f) - Best Before (WITH DERIVED DATE)
# ============================================================

def check_lm_006_best_before_use_by(product: ProductData) -> RuleResult:
    category = (product.category or "").strip().lower()
    dates = product.dates
    bb = dates.best_before if dates else None
    use_by = dates.use_by if dates else None
    evidence = _get_evidence(product, "best_before") if not use_by else _get_evidence(product, "use_by")
    
    citation = "Legal Metrology (PC) Rules 2011 — Rule 6(1)(f)"

    declaration = None
    if use_by and use_by.strip(): declaration = use_by.strip()
    elif bb and bb.strip(): declaration = bb.strip()

    if not declaration:
        if any(k in category for k in ["food", "beverage", "snack"]):
            return RuleResult(
                rule_id="LM-006", rule_name="Best Before", field="dates.best_before",
                status=ComplianceStatus.FAIL, detected_value=None, evidence="Evidence not available.",
                reason=f"Best before/expiry declaration missing for perishable food. [{citation}]",
                recommendation="Print valid Best Before or Use By declaration."
            )
        return RuleResult(
            rule_id="LM-006", rule_name="Best Before", field="dates.best_before",
            status=ComplianceStatus.REVIEW, detected_value=None, evidence="Evidence not available.",
            reason=f"Could not determine if expiry declaration is required. [{citation}]",
            recommendation="Verify commodity category."
        )

    # Parse explicit dates
    explicit_expiry = None
    for fmt in ["%d/%m/%Y", "%d-%m-%Y", "%d %B %Y", "%B %d %Y"]:
        try:
            explicit_expiry = datetime.strptime(declaration.split(' ')[0], fmt).date()
            break
        except: pass

    if explicit_expiry:
        status = ComplianceStatus.PASS if explicit_expiry >= date.today() else ComplianceStatus.FAIL
        reason = f"Expiry date {explicit_expiry.strftime('%d %b %Y')} calculated. [{citation}]"
        return RuleResult(
            rule_id="LM-006", rule_name="Best Before", field="dates.best_before",
            status=status, detected_value=f"Expiry: {explicit_expiry.strftime('%d %b %Y')}",
            evidence=(evidence if evidence != "Evidence not available." else declaration),
            reason=reason,
            recommendation=None if status == ComplianceStatus.PASS else "Product expired."
        )

    # Relative date math (e.g. 6 months)
    rel_match = re.search(r"(\d+)\s*(day|days|month|months|year|years)", declaration, re.IGNORECASE)
    base_text = dates.manufacture_date or dates.packing_date if dates else None

    if rel_match and base_text:
        amount = int(rel_match.group(1))
        unit = rel_match.group(2).lower()
        
        base_date = None
        # Try YYYY-MM-DD or MM/YYYY
        my_match = re.search(r"\b(0?[1-9]|1[0-2])[/-](\d{4})\b", base_text)
        if my_match:
            base_date = date(int(my_match.group(2)), int(my_match.group(1)), 1)
        
        if base_date:
            calc_expiry = base_date
            if "month" in unit:
                total = base_date.year * 12 + base_date.month - 1 + amount
                calc_expiry = date(total // 12, total % 12 + 1, min(base_date.day, calendar.monthrange(total // 12, total % 12 + 1)[1]))
            elif "year" in unit:
                calc_expiry = date(base_date.year + amount, base_date.month, base_date.day)
            else:
                calc_expiry = base_date + timedelta(days=amount)

            status = ComplianceStatus.PASS if calc_expiry >= date.today() else ComplianceStatus.FAIL
            return RuleResult(
                rule_id="LM-006", rule_name="Best Before", field="dates.best_before",
                status=status, detected_value=f"Derived Expiry: {calc_expiry.strftime('%d %b %Y')}",
                evidence=(evidence if evidence != "Evidence not available." else f"Mfg: {base_text}, Shelf: {declaration}"),
                reason=f"Calculated from '{base_text}' + {declaration}. [{citation}]",
                recommendation=None if status == ComplianceStatus.PASS else "Product expired."
            )

    return RuleResult(
        rule_id="LM-006", rule_name="Best Before", field="dates.best_before",
        status=ComplianceStatus.REVIEW, detected_value=f"Best Before: {declaration}",
        evidence=declaration, reason=f"Date declaration detected but cannot be interpreted. [{citation}]",
        recommendation="Officer must verify manually."
    )


# ============================================================
# LM-007: Rule 6(1)(g) - MRP
# ============================================================

def check_lm_007_mrp(product: ProductData) -> RuleResult:
    mrp = product.mrp
    val = mrp.value if mrp else None
    evidence = _get_evidence(product, "mrp", mrp.raw_text if mrp else None)
    citation = "Legal Metrology (PC) Rules 2011 — Rule 6(1)(g)"

    if val and str(val).strip():
        return RuleResult(
            rule_id="LM-007", rule_name="Maximum Retail Price", field="mrp.value",
            status=ComplianceStatus.PASS, detected_value=f"₹{val}",
            evidence=(evidence if evidence != "Evidence not available." else f"₹{val}"),
            reason=f"MRP verified. [{citation}]",
            recommendation=None
        )

    return RuleResult(
        rule_id="LM-007", rule_name="Maximum Retail Price", field="mrp.value",
        status=ComplianceStatus.FAIL, detected_value=None, evidence="Evidence not available.",
        reason=f"MRP missing. [{citation}]",
        recommendation="Print MRP ₹ [Amount] clearly."
    )


# ============================================================
# LM-008: Rule 6(1)(g) - Tax Inclusive
# ============================================================

def check_lm_008_mrp_tax_inclusive(product: ProductData) -> RuleResult:
    mrp = product.mrp
    evidence = _get_evidence(product, "mrp")
    citation = "Legal Metrology (PC) Rules 2011 — Rule 6(1)(g)"

    if not mrp or not mrp.value:
        return RuleResult(
            rule_id="LM-008", rule_name="Tax Inclusive Indication", field="mrp.inclusive",
            status=ComplianceStatus.NA, detected_value="MRP absent", evidence="N/A",
            reason=f"Rule not applicable without MRP. [{citation}]",
            recommendation=None
        )

    raw = (mrp.raw_text or "").lower()
    if mrp.inclusive_of_taxes is True or "incl" in raw or "tax" in raw:
        return RuleResult(
            rule_id="LM-008", rule_name="Tax Inclusive Indication", field="mrp.inclusive",
            status=ComplianceStatus.PASS, detected_value="Inclusive of all taxes",
            evidence=(evidence if evidence != "Evidence not available." else raw),
            reason=f"Tax-inclusive wording identified. [{citation}]",
            recommendation=None
        )

    return RuleResult(
        rule_id="LM-008", rule_name="Tax Inclusive Indication", field="mrp.inclusive",
        status=ComplianceStatus.FAIL, detected_value="Missing tax-inclusive wording",
        evidence=(evidence if evidence != "Evidence not available." else raw),
        reason=f"Mandatory '(Inclusive of all taxes)' missing. [{citation}]",
        recommendation="Add '(Inclusive of all taxes)' after MRP."
    )


# ============================================================
# LM-009: Rule 6(1)(h) - Consumer Care
# ============================================================

def check_lm_009_consumer_care(product: ProductData) -> RuleResult:
    cc = product.consumer_care
    evidence = _get_evidence(product, "consumer_care")
    citation = "Legal Metrology (PC) Rules 2011 — Rule 6(1)(h)"

    contacts = []
    if cc:
        if cc.phone: contacts.append(f"Tel: {cc.phone.strip()}")
        if cc.email: contacts.append(f"Email: {cc.email.strip()}")
        if cc.address: contacts.append(f"Addr: {cc.address.strip()}")

    if contacts:
        return RuleResult(
            rule_id="LM-009", rule_name="Consumer Care", field="consumer_care",
            status=ComplianceStatus.PASS, detected_value=" | ".join(contacts),
            evidence=(evidence if evidence != "Evidence not available." else " | ".join(contacts)),
            reason=f"Consumer care detected ({len(contacts)} channels). [{citation}]",
            recommendation=None
        )

    return RuleResult(
        rule_id="LM-009", rule_name="Consumer Care", field="consumer_care",
        status=ComplianceStatus.REVIEW, detected_value=None, evidence="Evidence not available.",
        reason=f"Consumer care contact not identified. [{citation}]",
        recommendation="Inspect back/side areas for phone, email, or address."
    )


# ============================================================
# LM-010: Tamper / Occlusion Check (New)
# ============================================================

def check_lm_010_occlusion(product: ProductData) -> RuleResult:
    """LM-010: Tamper / MRP Sticker Overlap Check."""
    occlusion = getattr(product, "occlusion_findings", []) or []
    citation = "Legal Metrology (PC) Rules 2011 — Rule 6(3) (Sticker/Tamper)"
    
    if occlusion:
        # Find which specific fields are affected
        affected_fields = set()
        for f in occlusion:
            field = f.get("field", "unknown")
            if field == "manufacturer": affected_fields.add("Manufacturer Details")
            elif field == "mrp": affected_fields.add("MRP")
            elif field == "dates": affected_fields.add("Dates")
            elif field == "consumer_care": affected_fields.add("Consumer Care")
            else: affected_fields.add(field.capitalize())
            
        affected_str = ", ".join(sorted(affected_fields))
        
        return RuleResult(
            rule_id="LM-010", rule_name="Tamper / Overlay Check", field="occlusion",
            status=ComplianceStatus.FAIL, 
            detected_value=f"Overlap detected on: {affected_str}",
            evidence=f"A sticker-like rectangular region was detected overlapping mandatory declaration(s).",
            reason=f"Possible MRP sticker or overlay covering original declaration. [{citation}]",
            recommendation="Inspect physical package. Original declarations must not be obscured."
        )
        
    return RuleResult(
        rule_id="LM-010", rule_name="Tamper / Overlay Check", field="occlusion",
        status=ComplianceStatus.PASS, detected_value="No occlusion detected",
        evidence="No overlapping sticker-like regions found.",
        reason=f"No tampering detected on mandatory declarations. [{citation}]",
        recommendation=None
    )


# ============================================================
# ALL LEGAL METROLOGY RULES
# ============================================================

ALL_RULES = [
    check_lm_001_manufacturer,
    check_lm_002_country_of_origin,
    check_lm_003_generic_name,
    check_lm_004_net_quantity,
    check_lm_005_mfg_packing_date,
    check_lm_006_best_before_use_by,
    check_lm_007_mrp,
    check_lm_008_mrp_tax_inclusive,
    check_lm_009_consumer_care,
    check_lm_010_occlusion,  # <--- Added LM-010
]