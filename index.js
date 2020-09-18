const fetch = require("node-fetch");
const fs = require("fs");
const { promisify } = require("util");
const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question[promisify.custom] = function (prompt) {
    return new Promise(resolve => rl.question(prompt, resolve));
};
const prompt = promisify(rl.question);

const jobs = require("./jobs.json");

const fetchRecipes = async (job, from = 0, recipies = []) => {
    const body = {
        "indexes": "recipe",
        "columns": "ID,AmountIngredient0,AmountIngredient1,AmountIngredient2,AmountIngredient3,AmountIngredient4,AmountIngredient5,AmountIngredient6,AmountIngredient7,AmountIngredient8,AmountIngredient9,AmountResult,ItemIngredient0.ID,ItemIngredient0.Name,ItemIngredient1.ID,ItemIngredient1.Name,ItemIngredient2.ID,ItemIngredient2.Name,ItemIngredient3.ID,ItemIngredient3.Name,ItemIngredient4.ID,ItemIngredient4.Name,ItemIngredient5.ID,ItemIngredient5.Name,ItemIngredient6.ID,ItemIngredient6.Name,ItemIngredient7.ID,ItemIngredient7.Name,ItemIngredient8.ID,ItemIngredient8.Name,ItemIngredient9.ID,ItemIngredient9.Name,Name",
        "body": {
            "query": {
                "term": {
                    "ClassJob.ID": {
                        "value": job
                    }
                }
            },
            "from": from,
            "size": 100
        }
    }

    let data = await fetch("https://xivapi.com/search", {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
    }).then(res => res.json())

    recipies.push(...data.Results)
    console.log("Recipies: ", recipies.length)
    if (recipies.length < data.Pagination.ResultsTotal) {
        console.log("Recursing from: ", from += 100)
        return fetchRecipes(job, from, recipies);
    }

    console.log("Returning result");
    return recipies;
}

const getJob = async () => {
    const jobCode = await prompt("Job Code: ");

    console.log(jobCode);
    const job = jobs.find(j => j.Short === jobCode.toUpperCase())
    console.log(job);
    if(!job) {
        console.log("Invalid job code.")
        return getJob();
    }

    return job.ID;
}

(async () => {
    const job = await getJob();

    const recipies = await fetchRecipes(job);

    console.log(recipies.length);
    const output = recipies.map(r => {
        const R = {
            name: r.Name,
            id: r.ID,
            ingredients: [],
            produces: r.AmountResult
        }

        for (let i = 0; i < 10; i++) {
            if (r[`AmountIngredient${i}`] !== 0) {
                R.ingredients.push({
                    id: r[`ItemIngredient${i}`].ID,
                    name: r[`ItemIngredient${i}`].Name,
                    amount: r[`AmountIngredient${i}`]
                })
            }
        }

        return R;
    })

    fs.writeFileSync("./alchemist.json", JSON.stringify(output, null, 2));
    process.exit(0);
})()
