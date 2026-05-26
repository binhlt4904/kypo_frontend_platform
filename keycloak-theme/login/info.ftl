<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
    <#if section = "form">
        <h2 id="kc-page-title"><#if requiredActions??><#list requiredActions><#items as reqActionItem>${msg("requiredAction.${reqActionItem}")}<#sep>, </#sep></#items></#list><#else>${msg("proceedWithAction")}</#if></h2>
        <div id="kc-info-message">
            <p class="instruction">${kcSanitize(message.summary)?no_esc} <#if requiredActions??><#list requiredActions><#items as reqActionItem>${msg("requiredAction.${reqActionItem}")}<#sep>, </#sep></#items></#list></#if></p>
            <#if skipLink??>
            <#else>
                <p><a href="${(client.baseUrl!'')}"> &laquo; ${msg("backToApplication")}</a></p>
            </#if>
        </div>
    </#if>
</@layout.registrationLayout>
