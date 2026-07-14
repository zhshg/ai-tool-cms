select count(*) as tools_total
from "tools"
where "deleted_at" is null;

select count(*) as categories_total
from "categories"
where "deleted_at" is null;

select count(*) as tools_with_category
from "tool_categories" tc
join "tools" t on t.id = tc."toolId"
where t."deleted_at" is null
  and tc."deleted_at" is null;
