function enrich_mi_logs(tag, timestamp, record)
    record["product"] = "Micro Integrator"
    record["service_type"] = "MI"
    if record["message"] then
        local runtimeId = string.match(record["message"], '%[icp%.runtimeId=([^%]]+)%]%s*$')
        if runtimeId then
            record["icp_runtimeId"] = runtimeId
            record["message"] = string.gsub(record["message"], '%s*%[icp%.runtimeId=[^%]]+%]%s*$', '')
        else
            record["icp_runtimeId"] = ""
        end
    else
        record["icp_runtimeId"] = ""
    end
    return 1, timestamp, record
end
