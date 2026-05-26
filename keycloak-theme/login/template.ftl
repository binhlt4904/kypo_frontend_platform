<!DOCTYPE html>
<html class="login-pf" lang="${locale}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>${msg("loginTitle",(realm.displayName!''))}</title>
    <link rel="icon" href="${url.resourcesCommonPath}/node_modules/patternfly/dist/img/favicon.ico" />
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
</head>
<body class="login-pf-page">
    <div id="kc-header" class="login-pf-page-header">
        <div id="kc-header-wrapper">${msg("loginTitleHtml",(realm.displayNameHtml!''))?no_esc}</div>
    </div>
    <div class="container">
        <div class="row">
            <div class="col-sm-8 col-sm-offset-2">
                <div id="kc-content">
                    <div id="kc-content-wrapper">
                        <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                            <div class="alert alert-${message.type}">
                                <#if message.type = 'success'><span class="pficon pficon-ok"></span></#if>
                                <#if message.type = 'warning'><span class="pficon pficon-warning-triangle-o"></span></#if>
                                <#if message.type = 'error'><span class="pficon pficon-error-circle-o"></span></#if>
                                <#if message.type = 'info'><span class="pficon pficon-info"></span></#if>
                                <span class="kc-feedback-text">${kcSanitize(message.summary)?no_esc}</span>
                            </div>
                        </#if>
                        <div id="kc-form" class="card-pf">
                            <div id="kc-form-wrapper">
                                <#if realm.password && social.providers??>
                                    <div id="kc-social-providers">
                                        <ul>
                                            <#list social.providers as p>
                                                <li>
                                                    <a href="${p.loginUrl}" id="zocial-${p.alias}" class="zocial ${p.providerId}">
                                                        <span>${p.displayName!}</span>
                                                    </a>
                                                </li>
                                            </#list>
                                        </ul>
                                    </div>
                                </#if>
                                <#nested "form">
                            </div>
                        </div>
                        <#if displayInfo>
                            <div id="kc-info">
                                <div id="kc-info-wrapper">
                                    <#nested "info">
                                </div>
                            </div>
                        </#if>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
