insert into public.industries (
  slug,
  name,
  description,
  default_keywords,
  priority_regions,
  tracked_topics
) values
  (
    'semiconductors',
    'Semiconductors',
    'Global semiconductor design, manufacturing, packaging, equipment, materials, and policy developments.',
    '["chips","semiconductors","foundry","fab","wafer","packaging","EDA","export controls","AI chips"]'::jsonb,
    '["East Asia","North America","Europe"]'::jsonb,
    '["capacity expansion","export controls","fab outages","advanced packaging","equipment restrictions"]'::jsonb
  ),
  (
    'oil-gas',
    'Oil & Gas',
    'Global oil and gas exploration, production, transport, refining, LNG, and petrochemical developments.',
    '["oil","gas","LNG","pipeline","refinery","offshore","drilling","petrochemical"]'::jsonb,
    '["Middle East","North America","Europe","Africa","Asia Pacific"]'::jsonb,
    '["production outages","shipping disruptions","sanctions","leasing","LNG capacity","refinery incidents"]'::jsonb
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  default_keywords = excluded.default_keywords,
  priority_regions = excluded.priority_regions,
  tracked_topics = excluded.tracked_topics;

with industry_map as (
  select id, slug from public.industries
)
insert into public.subsectors (industry_id, slug, name, description, sort_order)
select id, slug_value, name_value, description_value, sort_order
from (
  values
    ('semiconductors', 'eda-ip', 'EDA and Semiconductor IP', 'Design tools, verification, and reusable semiconductor IP blocks.', 10),
    ('semiconductors', 'fabless-design', 'Fabless Chip Design', 'Chip design companies without major wafer fabrication capacity.', 20),
    ('semiconductors', 'foundry-fabrication', 'Foundry and Wafer Fabrication', 'Contract wafer fabrication and front-end manufacturing.', 30),
    ('semiconductors', 'idm', 'Integrated Device Manufacturers', 'Vertically integrated chip companies with internal manufacturing.', 40),
    ('semiconductors', 'equipment', 'Semiconductor Equipment', 'Lithography, etch, deposition, metrology, and fab tooling.', 50),
    ('semiconductors', 'materials-wafers', 'Materials and Wafers', 'Wafers, gases, chemicals, substrates, and specialty materials.', 60),
    ('semiconductors', 'packaging-test', 'Assembly, Packaging, and Test', 'OSAT, ATP, advanced packaging, and backend test operations.', 70),
    ('semiconductors', 'memory', 'Memory Devices', 'Memory-focused manufacturing and supply-chain developments.', 80),
    ('oil-gas', 'upstream-ep', 'Upstream Exploration and Production', 'Exploration, drilling, field development, and production.', 10),
    ('oil-gas', 'oilfield-services', 'Oilfield Services and Drilling', 'Drilling contractors, field services, well completion, and support providers.', 20),
    ('oil-gas', 'midstream', 'Midstream Transportation and Storage', 'Gathering, processing, pipeline transport, storage, and terminals.', 30),
    ('oil-gas', 'lng-gas-processing', 'Gas Processing and LNG', 'Gas treatment, LNG liquefaction, export, import, and regasification.', 40),
    ('oil-gas', 'refining', 'Refining', 'Crude processing into fuels and refined products.', 50),
    ('oil-gas', 'petrochemicals-ngls', 'Petrochemicals and NGLs', 'NGL fractionation and petrochemical feedstock chains.', 60),
    ('oil-gas', 'fuel-distribution', 'Fuel Marketing and Distribution', 'Wholesale and retail distribution to end markets.', 70)
) as seed(industry_slug, slug_value, name_value, description_value, sort_order)
join industry_map on industry_map.slug = seed.industry_slug
on conflict (industry_id, slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

insert into public.severity_levels (level, label, color_name, color_hex, significance_rank, description) values
  (0, 'Neutral', 'Green', '#2E8B57', 0, 'Material industry news without a clear disruption or risk signal yet.'),
  (1, 'Low Significance', 'Yellow', '#F1C40F', 1, 'Limited local impact or an early signal worth watching.'),
  (2, 'Guarded', 'Orange', '#E67E22', 2, 'Contained operational or policy development with clear implications.'),
  (3, 'Elevated', 'Red', '#C0392B', 3, 'Regional or major company-level disruption with notable operational impact.'),
  (4, 'Severe', 'Dark Purple', '#4B0082', 4, 'Cross-border or multi-company disruption with major supply-chain consequences.'),
  (5, 'Critical', 'Black', '#111111', 5, 'Systemic, globally material, or geopolitically acute disruption.')
on conflict (level) do update
set
  label = excluded.label,
  color_name = excluded.color_name,
  color_hex = excluded.color_hex,
  significance_rank = excluded.significance_rank,
  description = excluded.description;

insert into public.event_types (slug, name, description) values
  ('tariff', 'Tariff', 'New or revised import or export tariff affecting industry flows.'),
  ('import-ban', 'Import Ban', 'Import restriction or ban affecting goods movement.'),
  ('export-control', 'Export Control', 'Export control, licensing action, or technology restriction.'),
  ('sanction', 'Sanction', 'Sanctions, entity restrictions, or related compliance action.'),
  ('factory-shutdown', 'Factory Shutdown', 'Planned or unplanned halt at a plant, fab, or processing facility.'),
  ('port-disruption', 'Port Disruption', 'Port, terminal, or shipping disruption affecting logistics.'),
  ('pipeline-disruption', 'Pipeline Disruption', 'Pipeline outage, leak, or operational constraint.'),
  ('labor-strike', 'Labor Strike', 'Labor action affecting operations or transport.'),
  ('policy-change', 'Policy Change', 'Government or regulatory change with operational significance.'),
  ('supply-shortage', 'Supply Shortage', 'Supply shortfall or allocation signal affecting delivery.'),
  ('investment-announcement', 'Investment Announcement', 'Capex, new project, or expansion announcement.'),
  ('accident-disaster', 'Accident or Disaster', 'Fire, explosion, spill, earthquake, flood, or similar event.'),
  ('conflict-disruption', 'Conflict-related Disruption', 'War, blockade, or conflict-driven operational risk.')
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description;
