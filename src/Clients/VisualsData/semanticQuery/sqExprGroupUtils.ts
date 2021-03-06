﻿/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved. 
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *   
 *  The above copyright notice and this permission notice shall be included in 
 *  all copies or substantial portions of the Software.
 *   
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

//// <reference path="../_references.ts"/>
module powerbi.data {
    // A group can consist of either a single expression, or a collection of hierarchy expressions
    export interface SQExprGroup {
        expr: SQExpr;
        children: SQHierarchyLevelExpr[];

        /** Index of expression in the query. */
        selectQueryIndex: number;
    };

    export module SQExprGroupUtils {
        /** Group all projections. Eacch group can consist of either a single property, or a collection of hierarchy items. */
        export function groupExprs(schema: FederatedConceptualSchema, exprs: SQExpr[], columnVariationEnabled: boolean): SQExprGroup[] {
            let groups: SQExprGroup[] = [];
            for (let i = 0, len = exprs.length; i < len; i++) {
                let expr = exprs[i];
                debug.assertValue(expr, "Expression not found");

                if (!columnVariationEnabled || !(expr instanceof SQHierarchyLevelExpr)) {
                    groups.push({ expr: expr, children: null, selectQueryIndex: i });
                }
                else {
                    addChildToGroup(schema, groups, expr, i);
                }
            }

            return groups;
        }

        function addChildToGroup(
            schema: FederatedConceptualSchema,
            groups: SQExprGroup[],
            expr: SQHierarchyLevelExpr,
            selectQueryIndex: number): void {

            // shouldAddExpressionToNewGroup is used to control whether we should add the passed expr to 
            // a new Group or to the last Group
            let shouldAddExpressionToNewGroup = true;
            let exprSource = SQHierarchyExprUtils.getSourceVariationExpr(expr) || SQHierarchyExprUtils.getSourceHierarchy(expr);
            let lastGroup = _.last(groups);

            // The relevant group is always the last added. If it has the same source hierarchy,
            // and is properly ordered within that hierarchy, we will need to add to this group.
            if (lastGroup && lastGroup.children && SQExpr.equals(lastGroup.expr, exprSource)) {
                let expandedExpr = SQHierarchyExprUtils.expandExpr(schema, expr.arg);
                if (expandedExpr instanceof Array) {
                    let allHierarchyLevels = <SQHierarchyLevelExpr[]>expandedExpr;
                    shouldAddExpressionToNewGroup = !SQHierarchyExprUtils.areHierarchyLevelsOrdered(allHierarchyLevels, _.last(lastGroup.children), expr);
                }
            }

            if (shouldAddExpressionToNewGroup)
                // Use the Sourcevariation as the expression for the group.
                groups.push({ expr: exprSource, children: [expr], selectQueryIndex: selectQueryIndex });
            else {
                debug.assertValue(lastGroup, 'There should be a group to add the variation to');
                debug.assertValue(lastGroup.children, 'The group should have children to add the variation to');
                lastGroup.children.push(expr);
            }
        }
    }
}