using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;

namespace MartiX.Platform.EntityFrameworkCore.Specifications;

/// <summary>
/// Immutable, non-materializing EF Core query criteria and execution policy.
/// </summary>
/// <typeparam name="TEntity">The entity type queried by the specification.</typeparam>
public sealed class Specification<TEntity>
{
    private readonly IReadOnlyList<IInclude> includes;
    private readonly IReadOnlyList<IOrdering> orderings;

    /// <summary>Initializes a specification with optional filtering and paging.</summary>
    /// <param name="predicate">The optional entity predicate.</param>
    /// <param name="asNoTracking">Whether the applied query uses no tracking.</param>
    /// <param name="skip">The optional number of rows to skip.</param>
    /// <param name="take">The optional maximum number of rows.</param>
    public Specification(
        Expression<Func<TEntity, bool>>? predicate = null,
        bool asNoTracking = false,
        int? skip = null,
        int? take = null)
    {
        ValidatePaging(skip, take, hasOrdering: false);
        this.includes = Empty<IInclude>();
        this.orderings = Empty<IOrdering>();
        Includes = Empty<LambdaExpression>();
        Orderings = Empty<LambdaExpression>();
        Predicate = predicate;
        NoTracking = asNoTracking;
        Skip = skip;
        Take = take;
    }

    private Specification(
        Expression<Func<TEntity, bool>>? predicate,
        bool noTracking,
        int? skip,
        int? take,
        IReadOnlyList<IInclude> includes,
        IReadOnlyList<IOrdering> orderings)
    {
        ValidatePaging(skip, take, orderings.Count > 0);
        Predicate = predicate;
        NoTracking = noTracking;
        Skip = skip;
        Take = take;
        this.includes = Copy(includes);
        this.orderings = Copy(orderings);
        Includes = new ReadOnlyCollection<LambdaExpression>(
            this.includes.Select(include => include.Navigation).ToArray());
        Orderings = new ReadOnlyCollection<LambdaExpression>(
            this.orderings.Select(ordering => ordering.KeySelector).ToArray());
    }

    /// <summary>Gets the optional entity predicate.</summary>
    public Expression<Func<TEntity, bool>>? Predicate { get; }

    /// <summary>Gets whether the applied query uses no tracking.</summary>
    public bool NoTracking { get; }

    /// <summary>Gets the included navigation expressions.</summary>
    public IReadOnlyList<LambdaExpression> Includes { get; }

    /// <summary>Gets the ordered key selector expressions.</summary>
    public IReadOnlyList<LambdaExpression> Orderings { get; }

    /// <summary>Gets the optional number of rows to skip.</summary>
    public int? Skip { get; }

    /// <summary>Gets the optional maximum number of rows.</summary>
    public int? Take { get; }

    /// <summary>Returns a specification that includes a navigation.</summary>
    /// <typeparam name="TProperty">The navigation property type.</typeparam>
    /// <param name="navigation">The navigation expression.</param>
    /// <returns>A new specification with the include appended.</returns>
    public Specification<TEntity> Include<TProperty>(
        Expression<Func<TEntity, TProperty>> navigation)
    {
        ArgumentNullException.ThrowIfNull(navigation);
        var nextIncludes = new List<IInclude>(includes)
        {
            new Include<TProperty>(navigation),
        };
        return Clone(includes: nextIncludes);
    }

    /// <summary>Returns a specification ordered by an entity property.</summary>
    /// <typeparam name="TProperty">The key property type.</typeparam>
    /// <param name="keySelector">The ascending key selector.</param>
    /// <returns>A new specification with the ordering applied.</returns>
    public Specification<TEntity> OrderBy<TProperty>(
        Expression<Func<TEntity, TProperty>> keySelector)
    {
        ArgumentNullException.ThrowIfNull(keySelector);
        return Clone(
            orderings:
            new IOrdering[]
            {
                new Ordering<TProperty>(keySelector, descending: false),
            });
    }

    /// <summary>Returns a specification ordered descending by an entity property.</summary>
    /// <typeparam name="TProperty">The key property type.</typeparam>
    /// <param name="keySelector">The descending key selector.</param>
    /// <returns>A new specification with the ordering applied.</returns>
    public Specification<TEntity> OrderByDescending<TProperty>(
        Expression<Func<TEntity, TProperty>> keySelector)
    {
        ArgumentNullException.ThrowIfNull(keySelector);
        return Clone(
            orderings:
            new IOrdering[]
            {
                new Ordering<TProperty>(keySelector, descending: true),
            });
    }

    /// <summary>Appends an ascending secondary ordering.</summary>
    /// <typeparam name="TProperty">The key property type.</typeparam>
    /// <param name="keySelector">The secondary key selector.</param>
    /// <returns>A new specification with the ordering appended.</returns>
    public Specification<TEntity> ThenBy<TProperty>(
        Expression<Func<TEntity, TProperty>> keySelector)
    {
        ArgumentNullException.ThrowIfNull(keySelector);
        if (orderings.Count == 0)
        {
            throw new InvalidOperationException(
                "ThenBy requires a preceding OrderBy.");
        }

        return Clone(
            orderings: orderings
                .Append(new Ordering<TProperty>(keySelector, descending: false))
                .ToArray());
    }

    /// <summary>Appends a descending secondary ordering.</summary>
    /// <typeparam name="TProperty">The key property type.</typeparam>
    /// <param name="keySelector">The secondary key selector.</param>
    /// <returns>A new specification with the ordering appended.</returns>
    public Specification<TEntity> ThenByDescending<TProperty>(
        Expression<Func<TEntity, TProperty>> keySelector)
    {
        ArgumentNullException.ThrowIfNull(keySelector);
        if (orderings.Count == 0)
        {
            throw new InvalidOperationException(
                "ThenByDescending requires a preceding OrderBy.");
        }

        return Clone(
            orderings: orderings
                .Append(new Ordering<TProperty>(keySelector, descending: true))
                .ToArray());
    }

    /// <summary>Returns a specification that uses no-tracking execution.</summary>
    /// <returns>A new no-tracking specification.</returns>
    public Specification<TEntity> AsNoTracking()
    {
        return Clone(noTracking: true);
    }

    /// <summary>Returns a specification that uses tracking execution.</summary>
    /// <returns>A new tracking specification.</returns>
    public Specification<TEntity> AsTracking()
    {
        return Clone(noTracking: false);
    }

    /// <summary>Returns a deterministically paged specification.</summary>
    /// <param name="skip">The number of rows to skip.</param>
    /// <param name="take">The maximum number of rows.</param>
    /// <returns>A new paged specification.</returns>
    public Specification<TEntity> Paginate(int skip, int take)
    {
        ValidatePaging(skip, take, orderings.Count > 0);
        return Clone(skip: skip, take: take);
    }

    /// <summary>Combines a predicate with the existing predicate using AND.</summary>
    /// <param name="predicate">The predicate to append.</param>
    /// <returns>A new composed specification.</returns>
    public Specification<TEntity> And(
        Expression<Func<TEntity, bool>> predicate)
    {
        ArgumentNullException.ThrowIfNull(predicate);
        return Clone(predicate: Combine(Predicate, predicate, Expression.AndAlso));
    }

    /// <summary>Combines a predicate with the existing predicate using OR.</summary>
    /// <param name="predicate">The predicate to append.</param>
    /// <returns>A new composed specification.</returns>
    public Specification<TEntity> Or(
        Expression<Func<TEntity, bool>> predicate)
    {
        ArgumentNullException.ThrowIfNull(predicate);
        return Clone(predicate: Combine(Predicate, predicate, Expression.OrElse));
    }

    /// <summary>Applies this specification without materializing the query.</summary>
    /// <param name="source">The source query.</param>
    /// <returns>The transformed query.</returns>
    public IQueryable<TEntity> Apply(IQueryable<TEntity> source)
    {
        ArgumentNullException.ThrowIfNull(source);

        var query = source;
        foreach (var include in includes)
        {
            query = include.Apply(query);
        }

        var predicate = Predicate;
        if (predicate is not null)
        {
            query = query.Where(predicate);
        }

        for (var index = 0; index < orderings.Count; index++)
        {
            query = orderings[index].Apply(query, thenBy: index > 0);
        }

        if (NoTracking)
        {
            query = query.AsNoTracking();
        }

        if (Skip is not null)
        {
            query = query.Skip(Skip.Value);
        }

        if (Take is not null)
        {
            query = query.Take(Take.Value);
        }

        return query;
    }

    /// <summary>Applies this specification and a projection without materializing.</summary>
    /// <typeparam name="TResult">The projected result type.</typeparam>
    /// <param name="source">The source query.</param>
    /// <param name="selector">The projection expression.</param>
    /// <returns>The projected transformed query.</returns>
    public IQueryable<TResult> Apply<TResult>(
        IQueryable<TEntity> source,
        Expression<Func<TEntity, TResult>> selector)
    {
        ArgumentNullException.ThrowIfNull(selector);
        return Apply(source).Select(selector);
    }

    private Specification<TEntity> Clone(
        Expression<Func<TEntity, bool>>? predicate = null,
        bool? noTracking = null,
        int? skip = null,
        int? take = null,
        IReadOnlyList<IInclude>? includes = null,
        IReadOnlyList<IOrdering>? orderings = null)
    {
        return new Specification<TEntity>(
            predicate ?? Predicate,
            noTracking ?? NoTracking,
            skip ?? Skip,
            take ?? Take,
            includes ?? this.includes,
            orderings ?? this.orderings);
    }

    private static Expression<Func<TEntity, bool>> Combine(
        Expression<Func<TEntity, bool>>? left,
        Expression<Func<TEntity, bool>> right,
        Func<Expression, Expression, BinaryExpression> combine)
    {
        if (left is null)
        {
            return right;
        }

        var parameter = Expression.Parameter(typeof(TEntity), "entity");
        var leftBody = new ParameterReplacer(left.Parameters[0], parameter)
            .Visit(left.Body)!;
        var rightBody = new ParameterReplacer(right.Parameters[0], parameter)
            .Visit(right.Body)!;
        return Expression.Lambda<Func<TEntity, bool>>(
            combine(leftBody, rightBody),
            parameter);
    }

    private static void ValidatePaging(
        int? skip,
        int? take,
        bool hasOrdering)
    {
        if (skip is < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(skip));
        }

        if (take is < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(take));
        }

        if ((skip is not null || take is not null) && !hasOrdering)
        {
            throw new ArgumentException(
                "Paging requires a deterministic ordering.",
                nameof(skip));
        }
    }

    private static IReadOnlyList<T> Empty<T>()
    {
        return new ReadOnlyCollection<T>(Array.Empty<T>());
    }

    private static IReadOnlyList<T> Copy<T>(IEnumerable<T> values)
    {
        return new ReadOnlyCollection<T>(values.ToArray());
    }

    private sealed class ParameterReplacer(
        ParameterExpression source,
        ParameterExpression target) : ExpressionVisitor
    {
        protected override Expression VisitParameter(
            ParameterExpression node)
        {
            return node == source ? target : base.VisitParameter(node);
        }
    }

    private interface IInclude
    {
        LambdaExpression Navigation { get; }

        IQueryable<TEntity> Apply(IQueryable<TEntity> source);
    }

    private sealed class Include<TProperty>(
        Expression<Func<TEntity, TProperty>> navigation) : IInclude
    {
        public LambdaExpression Navigation => navigation;

        public IQueryable<TEntity> Apply(IQueryable<TEntity> source)
        {
            return source.Include(navigation);
        }
    }

    private interface IOrdering
    {
        LambdaExpression KeySelector { get; }

        IQueryable<TEntity> Apply(
            IQueryable<TEntity> source,
            bool thenBy);
    }

    private sealed class Ordering<TProperty>(
        Expression<Func<TEntity, TProperty>> keySelector,
        bool descending) : IOrdering
    {
        public LambdaExpression KeySelector => keySelector;

        public IQueryable<TEntity> Apply(
            IQueryable<TEntity> source,
            bool thenBy)
        {
            if (!thenBy)
            {
                return descending
                    ? source.OrderByDescending(keySelector)
                    : source.OrderBy(keySelector);
            }

            if (source is not IOrderedQueryable<TEntity> ordered)
            {
                throw new InvalidOperationException(
                    "ThenBy requires a preceding OrderBy.");
            }

            return descending
                ? ordered.ThenByDescending(keySelector)
                : ordered.ThenBy(keySelector);
        }
    }
}
