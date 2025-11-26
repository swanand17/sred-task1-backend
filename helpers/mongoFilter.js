function buildMongoFilter(filterModel = {}, collection) {
  const mongo = {};

  // numeric fields per collection
  const numericFields = {
    github_issues: ["number", "id"],
    github_pulls: ["number", "id"],
    github_commits: [],
    github_repos: ["id", "size", "stargazers_count", "forks_count"],
    github_orgs: [],
    github_users: ["id"]
  };

  // date fields per collection
  const dateFields = {
    github_commits: ["commit.author.date", "commit.committer.date"],
    github_pulls: ["created_at", "updated_at", "closed_at", "merged_at"],
    github_issues: ["created_at", "updated_at", "closed_at"],
    github_repos: ["created_at", "updated_at", "pushed_at"],
    github_users: ["created_at"],
    github_orgs: []
  };

  const numFields = numericFields[collection] || [];
  const dtFields = dateFields[collection] || [];

  for (const [field, cond] of Object.entries(filterModel)) {
    if (!cond || !cond.filter) continue;

    let value = cond.filter;

    const isNumericField = numFields.includes(field);
    const isDateField = dtFields.includes(field);

    // NUMERIC
    if (isNumericField) {
      const numericValue = Number(value);
      if (isNaN(numericValue)) continue;

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
      }
      continue;
    }


    // DATE 
    if (isDateField) {
      let dateVal = new Date(value);
      if (isNaN(dateVal.getTime())) continue; // invalid date

      // AG Grid uses operators like equals, lessThan, greaterThan
      switch (cond.type) {
        case "equals":
          mongo[field] = {
            $gte: new Date(dateVal.setHours(0, 0, 0, 0)),
            $lte: new Date(dateVal.setHours(23, 59, 59, 999))
          };
          break;

        case "greaterThan":
          mongo[field] = { $gt: dateVal };
          break;

        case "lessThan":
          mongo[field] = { $lt: dateVal };
          break;

        case "notEqual":
          mongo[field] = {
            $not: {
              $gte: new Date(dateVal.setHours(0, 0, 0, 0)),
              $lte: new Date(dateVal.setHours(23, 59, 59, 999))
            }
          };
          break;
      }

      continue;
    }

    // STRING FILTERING
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
