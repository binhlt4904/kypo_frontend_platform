<!DOCTYPE html>
<html lang="${locale.currentLanguageTag}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>${msg("loginTitle",(realm.displayName!''))}</title>
    <link rel="icon" href="${url.resourcesPath}/img/favicon.ico"/>
    <#if properties.stylesCommon?has_content>
        <#list properties.stylesCommon?split(' ') as style>
            <link href="${url.resourcesCommonPath}/${style}" rel="stylesheet"/>
        </#list>
    </#if>
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet"/>
        </#list>
    </#if>
</head>
<body class="login-pf">
<div class="login-pf-page">
    <div id="kc-header">
        <div id="kc-header-wrapper">
            ${kcSanitize(msg("loginTitleHtml",(realm.displayNameHtml!'')))?no_esc}
        </div>
    </div>
    <div class="card-pf">
        <#if message?has_content>
            <div class="alert alert-${message.type}">
                <span>${kcSanitize(message.summary)?no_esc}</span>
            </div>
        </#if>
        <h1 id="kc-page-title">${msg("loginAccountTitle")}</h1>
        <form id="kc-form-login" onsubmit="login.disabled = true; return true;"
              action="${url.loginAction}" method="post">
            <div class="form-group">
                <label for="username">
                    <#if !realm.loginWithEmailAllowed>${msg("username")}
                    <#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}
                    <#else>${msg("email")}</#if>
                </label>
                <input tabindex="1" id="username" class="pf-c-form-control"
                       name="username" value="${(login.username!'')}"
                       type="text" autofocus autocomplete="off"/>
            </div>
            <div class="form-group">
                <label for="password">${msg("password")}</label>
                <div class="pf-c-input-group">
                    <input tabindex="2" id="password" class="pf-c-form-control"
                           name="password" type="password" autocomplete="current-password"/>
                    <button class="pf-c-button pf-m-control" type="button"
                            aria-label="${msg('showPassword')}"
                            onclick="var p=document.getElementById('password');p.type=p.type==='password'?'text':'password'">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="form-group">
                <input tabindex="4" class="pf-c-button pf-m-primary pf-m-block"
                       name="login" id="kc-login" type="submit"
                       value="${msg('doLogIn')}"/>
            </div>
        </form>
    </div>
</div>
</body>
</html>
