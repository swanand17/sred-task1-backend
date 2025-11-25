function buildMongoFilter(filterModel = {}, collection) {
  const mongo = {};

  // numeric fields for each collection
  const numericFields = {
    github_issues: ["number", "id"],
    github_pulls: ["number", "id"],
    github_commits: [],
    github_repos: ["id", "size", "stargazers_count", "forks_count"],
    github_orgs: [],
    github_users: ["id"]
  };

  const numFields = numericFields[collection] || [];

  for (const [field, cond] of Object.entries(filterModel)) {
    if (!cond || !cond.filter) continue;
    let value = cond.filter;

    const isNumericField = numFields.includes(field);

    // Numeric field handling
    if (isNumericField) {
      const numericValue = Number(value);
      if (isNaN(numericValue)) {
        continue;
      }

      switch (cond.type) {
        case "equals":
          mongo[field] = numericValue;
          break;
        case "notEqual":
          mongo[field] = { $ne: numericValue };
          break;
        case "greaterThan":
          mongo[field] = { $gt: numericValue };
          break;
        case "lessThan":
          mongo[field] = { $lt: numericValue };
          break;
        default:
          break;
      }

      continue;
    }

    switch (cond.type) {
      case "contains":
        mongo[field] = { $regex: value, $options: "i" };
        break;
      case "notContains":
        mongo[field] = { $not: new RegExp(value, "i") };
        break;
      case "equals":
        mongo[field] = value;
        break;
      case "notEqual":
        mongo[field] = { $ne: value };
        break;
      case "startsWith":
        mongo[field] = { $regex: "^" + value, $options: "i" };
        break;
      case "endsWith":
        mongo[field] = { $regex: value + "$", $options: "i" };
        break;
    }
  }

  return mongo;
}
export { buildMongoFilter };