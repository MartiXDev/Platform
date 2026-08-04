## Data and serialization map

### Purpose

Show how serialization and EF Core guidance trace back to Microsoft
documentation and the approved research memo.

### Rule coverage

- **JSON serialization and payload contracts**
  - Rule files: `rules/data-serialization.md`
  - Primary sources:
    - [System.Text.Json overview](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/overview)
    - [Serialize and deserialize JSON](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/how-to)
  - Notes: Use for serializer defaults, payload shape, and streaming
    guidance.
- **EF Core modeling, querying, saving, and reliability**
  - Rule files: `rules/data-efcore.md`
  - Primary sources:
    - [EF Core documentation hub](https://learn.microsoft.com/en-us/ef/core/)
    - [Efficient querying](https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying)
    - [Handling concurrency conflicts](https://learn.microsoft.com/en-us/ef/core/saving/concurrency)
    - [Connection resiliency](https://learn.microsoft.com/en-us/ef/core/miscellaneous/connection-resiliency)
  - Notes: Use for context lifetime, migrations, performance, and optimistic
    concurrency.

### Maintenance notes

- This first pass keeps raw SQL safety and provider-specific differences inside
  the EF Core rule rather than creating extra files outside the approved
  structure.
- Expand the map if a later approved structure adds dedicated data testing or
  raw SQL rule files.
